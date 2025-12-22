import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription.model';

// Configure web-push with VAPID details
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Send notification to a specific user
 */
export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
) {
  try {
    // Find all subscriptions for this user
    const subscriptions = await PushSubscription.find({ userId });

    if (subscriptions.length === 0) {
      console.warn(`No subscriptions found for user: ${userId}`);
      return { success: false, error: 'No subscriptions found' };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: {
        url: payload.url || '/deliverystaff',
        ...payload.data,
      },
    });

    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            notificationPayload
          );
          return { success: true, userId, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error(`Failed to send notification to ${subscription.endpoint}:`, error);

          // If subscription is invalid, delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: subscription._id });
            console.log(`Deleted invalid subscription: ${subscription._id}`);
          }

          return { success: false, error: error.message };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `Sent notifications to ${successCount}/${subscriptions.length} devices for user: ${userId}`
    );

    return { success: successCount > 0, results };
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to delivery staff for specific shipment status
 */
export async function sendShipmentNotification(
  userId: string,
  shipmentId: string,
  trackingId: string,
  status: string,
  action: string
) {
  const statusMessages: Record<string, string> = {
    'Assigned': 'New delivery assigned to you',
    'Out for Delivery': 'Package is out for delivery',
    'Delivered': 'Delivery completed',
    'Failed': 'Delivery attempt failed',
    'Delivery Completed': 'Delivery completed',
    'Delivery Failed': 'Delivery attempt failed',
    'At Destination Branch': 'Package arrived at destination',
    'Manifest In Transit': 'Manifest arriving to your branch',
    'Manifest Delivered': 'Manifest successfully received',
  };

  const body = statusMessages[status] || `Status updated to ${status}`;
  
  // 👇 FIX: Use correct URL for manifest events vs shipment events
  const url = action === 'manifest_dispatched' || action === 'manifest_arrived'
    ? '/dashboard/dispatch'  // Branch admins/dispatchers view manifests here
    : `/deliverystaff?shipmentId=${shipmentId}`; // Delivery staff view shipments here

  return sendNotificationToUser(userId, {
    title: action === 'manifest_dispatched' || action === 'manifest_arrived'
      ? `Manifest: ${trackingId}`
      : `Delivery: ${trackingId}`,
    body,
    url,
    data: {
      shipmentId,
      trackingId,
      status,
      action,
    },
  });
}
