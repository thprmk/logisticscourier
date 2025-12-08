/**
 * Notification Dispatcher
 * Handles all event-based notifications for shipments, manifests, and assignments
 */

import Notification from '@/models/Notification.model';
import User from '@/models/User.model';
import { sendShipmentNotification } from './notifications';

export type NotificationEvent = 
  | 'shipment_created'
  | 'manifest_created'
  | 'manifest_dispatched'
  | 'manifest_arrived'
  | 'delivery_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed';

export interface NotificationContext {
  event: NotificationEvent;
  shipmentId?: string;
  manifestId?: string;
  trackingId: string;
  tenantId: string;
  fromBranch?: string;
  toBranch?: string;
  assignedStaffId?: string;
  createdBy?: string; // Admin/Dispatcher ID
}

/**
 * Central notification dispatcher for all system events
 */
export async function dispatchNotification(context: NotificationContext) {
  try {
    console.log(`Processing notification event: ${context.event}`, context);

    switch (context.event) {
      case 'shipment_created':
        await handleShipmentCreated(context);
        break;

      case 'manifest_created':
        await handleManifestCreated(context);
        break;

      case 'manifest_dispatched':
        await handleManifestDispatched(context);
        break;

      case 'manifest_arrived':
        await handleManifestArrived(context);
        break;

      case 'delivery_assigned':
        await handleDeliveryAssigned(context);
        break;

      case 'out_for_delivery':
        await handleOutForDelivery(context);
        break;

      case 'delivered':
        await handleDelivered(context);
        break;

      case 'delivery_failed':
        await handleDeliveryFailed(context);
        break;

      default:
        console.warn(`Unknown notification event: ${context.event}`);
    }
  } catch (error) {
    console.error(`Error dispatching notification for event ${context.event}:`, error);
    // Don't throw - notifications shouldn't break the main flow
  }
}

/**
 * Shipment Created Event
 * Notify: Admin ✔️, Dispatcher ✔️
 */
async function handleShipmentCreated(context: NotificationContext) {
  const { tenantId, trackingId, shipmentId, createdBy } = context;

  // Get all admins and dispatchers for this branch
  const adminUsers = await User.find({
    tenantId,
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const notificationRecords = adminUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'shipment_created' as const,
    shipmentId,
    trackingId,
    message: `New shipment created - ${trackingId}`,
    read: false,
  }));

  if (notificationRecords.length > 0) {
    await Notification.insertMany(notificationRecords);
    console.log(`Created notifications for ${notificationRecords.length} admins/dispatchers`);
  }
}

/**
 * Manifest Created Event
 * Notify: Admin ✔️, Dispatcher ✔️
 */
async function handleManifestCreated(context: NotificationContext) {
  const { tenantId, manifestId, trackingId } = context;

  // Get all admins and dispatchers for this branch
  const adminUsers = await User.find({
    tenantId,
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const notificationRecords = adminUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'manifest_created' as const,
    manifestId,
    trackingId,
    message: `New manifest created - ${trackingId}`,
    read: false,
  }));

  if (notificationRecords.length > 0) {
    await Notification.insertMany(notificationRecords);
    console.log(`Created manifest notifications for ${notificationRecords.length} users`);
  }
}

/**
 * Manifest Dispatched Event
 * Notify: Admins & Dispatchers at DESTINATION branch when manifest is in transit
 */
async function handleManifestDispatched(context: NotificationContext) {
  const { manifestId, trackingId, fromBranch, toBranch, tenantId } = context;

  // 👇 FIX: For inter-branch delivery, notify DESTINATION branch admins/dispatchers
  // They need to know a manifest is coming to them
  const destinationUsers = await User.find({
    tenantId,  // This should be the DESTINATION tenantId, not origin
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const destNotifications = destinationUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'manifest_dispatched' as const,
    manifestId,
    trackingId,
    message: `Manifest arriving from ${fromBranch || 'origin branch'} - ${trackingId}`,
    read: false,
  }));

  if (destNotifications.length > 0) {
    await Notification.insertMany(destNotifications);
    console.log(`Manifest dispatch notifications created for ${destNotifications.length} users at destination`);
    
    // 👇 Send push notifications to destination branch
    await Promise.all(
      destinationUsers.map(user =>
        sendShipmentNotification(
          (user._id as any).toString(),
          manifestId!,
          trackingId,
          'Manifest In Transit',
          'manifest_dispatched'
        ).catch(err => {
          console.error(`Failed to send push to destination user:`, err);
        })
      )
    );
  }
}

/**
 * Manifest Arrived Event
 * Notify: Admins & Dispatchers at ORIGIN branch that manifest arrived at destination
 */
async function handleManifestArrived(context: NotificationContext) {
  const { tenantId, manifestId, trackingId, toBranch } = context;

  // 👇 FIX: For inter-branch delivery, notify ORIGIN branch admins/dispatchers
  // They need to know the manifest has been received at the destination
  const originUsers = await User.find({
    tenantId,  // This should be the ORIGIN tenantId, not destination
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const notificationRecords = originUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'manifest_arrived' as const,
    manifestId,
    trackingId,
    message: `Manifest successfully received at ${toBranch || 'destination branch'} - ${trackingId}`,
    read: false,
  }));

  if (notificationRecords.length > 0) {
    await Notification.insertMany(notificationRecords);
    console.log(`Manifest arrival notifications created for ${notificationRecords.length} users at origin`);
    
    // 👇 Send push notifications to origin branch
    await Promise.all(
      originUsers.map(user =>
        sendShipmentNotification(
          (user._id as any).toString(),
          manifestId!,
          trackingId,
          'Manifest Delivered',
          'manifest_arrived'
        ).catch(err => {
          console.error(`Failed to send push to origin user:`, err);
        })
      )
    );
  }
}

/**
 * Local Delivery Assigned Event
 * Notify: Admin ✔️, Dispatcher ✔️, Staff ✔️ (with push notification)
 */
async function handleDeliveryAssigned(context: NotificationContext) {
  const { tenantId, shipmentId, trackingId, assignedStaffId } = context;

  console.log('[Delivery Assigned] Processing:', {
    assignedStaffId,
    assignedStaffIdType: typeof assignedStaffId,
    trackingId,
    shipmentId,
    tenantId
  });

  if (!assignedStaffId) {
    console.warn('Delivery assigned event missing assignedStaffId');
    return;
  }

  // Get admins and dispatchers
  const adminUsers = await User.find({
    tenantId,
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  // Create notifications for admins/dispatchers
  const adminNotifications = adminUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'delivery_assigned' as const,
    shipmentId,
    trackingId,
    message: `Delivery assigned to staff - ${trackingId}`,
    read: false,
  }));

  // Create notification for assigned staff
  const staffNotification = {
    tenantId,
    userId: assignedStaffId,
    type: 'delivery_assigned' as const,
    shipmentId,
    trackingId,
    message: `New delivery assigned to you - ${trackingId}`,
    read: false,
  };

  console.log('[Delivery Assigned] Staff notification object:', {
    userId: staffNotification.userId,
    userIdType: typeof staffNotification.userId,
    message: staffNotification.message
  });

  // Save all notifications
  const allNotifications = [...adminNotifications, staffNotification];
  if (allNotifications.length > 0) {
    await Notification.insertMany(allNotifications);
    console.log(`[Delivery Assigned] Notifications created for ${allNotifications.length} users:`, {
      adminCount: adminNotifications.length,
      staffId: staffNotification.userId,
      message: staffNotification.message
    });
  } else {
    console.warn('[Delivery Assigned] No notifications to save');
  }

  // Send PUSH notification to staff (immediate alert)
  await sendShipmentNotification(
    assignedStaffId.toString(),
    shipmentId!,
    trackingId,
    'Assigned',
    'delivery_assigned'
  ).catch(err => {
    console.error('Failed to send push notification to staff:', err);
  });

  console.log(`Delivery assignment notifications created for ${allNotifications.length} users`);
}

/**
 * Out for Delivery Event
 * Notify: Admin ✔️, Dispatcher ✔️, Staff ✔️
 */
async function handleOutForDelivery(context: NotificationContext) {
  const { tenantId, shipmentId, trackingId, assignedStaffId } = context;

  // Get all admins and dispatchers
  const adminUsers = await User.find({
    tenantId,
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const notificationRecords = adminUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'out_for_delivery' as const,
    shipmentId,
    trackingId,
    message: `Delivery out for delivery - ${trackingId}`,
    read: false,
  }));

  // Also notify assigned staff
  if (assignedStaffId) {
    notificationRecords.push({
      tenantId,
      userId: assignedStaffId,
      type: 'out_for_delivery' as const,
      shipmentId,
      trackingId,
      message: `Your delivery is out for delivery - ${trackingId}`,
      read: false,
    });

    // Send push notification to staff
    await sendShipmentNotification(
      assignedStaffId.toString(),
      shipmentId!,
      trackingId,
      'Out for Delivery',
      'out_for_delivery'
    ).catch(err => {
      console.error('Failed to send out for delivery push notification:', err);
    });
  }

  if (notificationRecords.length > 0) {
    await Notification.insertMany(notificationRecords);
    console.log(`Out for delivery notifications created for ${notificationRecords.length} users`);
  }
}

/**
 * Delivered Event
 * Notify: Admin ✔️, Dispatcher ✔️, Staff ✔️
 */
async function handleDelivered(context: NotificationContext) {
  const { tenantId, shipmentId, trackingId, assignedStaffId } = context;

  // Get all admins and dispatchers
  const adminUsers = await User.find({
    tenantId,
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const notificationRecords = adminUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'delivered' as const,
    shipmentId,
    trackingId,
    message: `Delivery completed - ${trackingId}`,
    read: false,
  }));

  // Also notify assigned staff
  if (assignedStaffId) {
    notificationRecords.push({
      tenantId,
      userId: assignedStaffId,
      type: 'delivered' as const,
      shipmentId,
      trackingId,
      message: `Delivery completed successfully - ${trackingId}`,
      read: false,
    });

    // Send push notification to staff
    await sendShipmentNotification(
      assignedStaffId.toString(),
      shipmentId!,
      trackingId,
      'Delivered',
      'delivered'
    ).catch(err => {
      console.error('Failed to send delivery push notification:', err);
    });
  }

  // 👇 FIX: Send push notifications to admins and dispatchers
  await Promise.all(
    adminUsers.map(user =>
      sendShipmentNotification(
        user._id.toString(),
        shipmentId!,
        trackingId,
        'Delivery Completed',
        'delivered'
      ).catch(err => {
        console.error(`Failed to send push to admin ${user._id}:`, err);
      })
    )
  );

  if (notificationRecords.length > 0) {
    await Notification.insertMany(notificationRecords);
    console.log(`Delivery completed notifications created for ${notificationRecords.length} users`);
  }
}

/**
 * Delivery Failed Event
 * Notify: Admin ✔️, Dispatcher ✔️, Staff ✔️
 */
async function handleDeliveryFailed(context: NotificationContext) {
  const { tenantId, shipmentId, trackingId, assignedStaffId } = context;

  // Get all admins and dispatchers
  const adminUsers = await User.find({
    tenantId,
    role: { $in: ['admin', 'dispatcher'] }
  }).select('_id').lean();

  const notificationRecords = adminUsers.map(user => ({
    tenantId,
    userId: user._id,
    type: 'delivery_failed' as const,
    shipmentId,
    trackingId,
    message: `Delivery failed - ${trackingId}`,
    read: false,
  }));

  // Also notify assigned staff
  if (assignedStaffId) {
    notificationRecords.push({
      tenantId,
      userId: assignedStaffId,
      type: 'delivery_failed' as const,
      shipmentId,
      trackingId,
      message: `Delivery attempt failed - ${trackingId}`,
      read: false,
    });

    // Send push notification to staff
    await sendShipmentNotification(
      assignedStaffId.toString(),
      shipmentId!,
      trackingId,
      'Failed',
      'delivery_failed'
    ).catch(err => {
      console.error('Failed to send delivery failed push notification:', err);
    });
  }

  // 👇 FIX: Send push notifications to admins and dispatchers
  await Promise.all(
    adminUsers.map(user =>
      sendShipmentNotification(
        user._id.toString(),
        shipmentId!,
        trackingId,
        'Delivery Failed',
        'delivery_failed'
      ).catch(err => {
        console.error(`Failed to send push to admin ${user._id}:`, err);
      })
    )
  );

  if (notificationRecords.length > 0) {
    await Notification.insertMany(notificationRecords);
    console.log(`Delivery failed notifications created for ${notificationRecords.length} users`);
  }
}
