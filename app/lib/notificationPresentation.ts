/**
 * Notification Type Mapper
 * Maps database notification types to visual presentation types
 */

import { NotificationType } from '@/app/components/NotificationItem';

export interface NotificationPresentation {
  type: NotificationType;
  pill: string;
  title: string;
}

export const notificationTypeMap: Record<string, NotificationPresentation> = {
  // Delivery events
  'delivery_assigned': {
    type: 'warning',
    pill: 'Assigned',
    title: 'Delivery Assigned',
  },
  'out_for_delivery': {
    type: 'warning',
    pill: 'Out for Delivery',
    title: 'Out for Delivery',
  },
  'delivered': {
    type: 'success',
    pill: 'Delivered',
    title: 'Delivery Completed',
  },
  'delivery_failed': {
    type: 'error',
    pill: 'Failed',
    title: 'Delivery Failed',
  },

  // Shipment events
  'shipment_created': {
    type: 'info',
    pill: 'New Shipment',
    title: 'Shipment Created',
  },

  // Manifest events
  'manifest_created': {
    type: 'info',
    pill: 'New Manifest',
    title: 'Manifest Created',
  },
  'manifest_dispatched': {
    type: 'warning',
    pill: 'Manifest Dispatched',
    title: 'Manifest Dispatched',
  },
  'manifest_arrived': {
    type: 'info',
    pill: 'Manifest Arrived',
    title: 'Manifest Arrived',
  },

  // Legacy events (for backward compatibility)
  'assignment': {
    type: 'warning',
    pill: 'Assigned',
    title: 'Assignment',
  },
  'status_update': {
    type: 'info',
    pill: 'Status Update',
    title: 'Status Update',
  },
};

/**
 * Get visual presentation for a notification type
 */
export function getNotificationPresentation(
  notificationType: string
): NotificationPresentation {
  return (
    notificationTypeMap[notificationType] || {
      type: 'info',
      pill: 'Notification',
      title: 'Notification',
    }
  );
}

/**
 * Format timestamp for display
 */
export function formatNotificationTime(date: string | Date): string {
  const notifDate = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older notifications, show the date
  return notifDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Extract shipment/manifest ID from notification message for linking
 */
export function extractIdFromMessage(message: string): string | null {
  // Extract tracking ID like TRK-XXXXXX
  const trackingMatch = message.match(/TRK-[A-Z0-9]+/);
  if (trackingMatch) return trackingMatch[0];

  // Extract other IDs if needed
  return null;
}
