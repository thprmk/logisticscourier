// models/Notification.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface INotification extends Document {
  tenantId: Schema.Types.ObjectId;      // The branch this notification belongs to
  userId: Schema.Types.ObjectId;        // The user who should receive this notification
  type: 'shipment_created' | 'manifest_created' | 'manifest_dispatched' | 'manifest_arrived' | 'delivery_assigned' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'assignment' | 'status_update'; // Type of notification
  shipmentId?: Schema.Types.ObjectId;    // The related shipment
  manifestId?: Schema.Types.ObjectId;    // The related manifest
  trackingId: string;                   // For easy reference
  message: string;                      // The notification message
  read: boolean;                        // Whether the notification has been read
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['shipment_created', 'manifest_created', 'manifest_dispatched', 'manifest_arrived', 'delivery_assigned', 'out_for_delivery', 'delivered', 'delivery_failed', 'assignment', 'status_update'], 
    required: true 
  },
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment' },
  manifestId: { type: Schema.Types.ObjectId, ref: 'Manifest' },
  trackingId: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

// Index for efficient querying
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// ✅ FIX: Add compound index for tenant-based queries (performance optimization)
NotificationSchema.index({ tenantId: 1, userId: 1, read: 1, createdAt: -1 });

const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);

export default Notification;
