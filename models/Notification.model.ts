// models/Notification.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface INotification extends Document {
  tenantId: Schema.Types.ObjectId;      // Associated branch
  userId: Schema.Types.ObjectId;        // Recipient user
  type: 'assignment' | 'status_update'; // Event type
  shipmentId: Schema.Types.ObjectId;    // Related shipment
  trackingId: string;                   // Tracking reference
  message: string;                      // Notification content
  read: boolean;                        // Read status
  createdAt?: Date;                     // Auto-generated
  updatedAt?: Date;                     // Auto-generated
}

const NotificationSchema = new Schema<INotification>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['assignment', 'status_update'], 
    required: true 
  },
  shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: true },
  trackingId: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);

export default Notification;
