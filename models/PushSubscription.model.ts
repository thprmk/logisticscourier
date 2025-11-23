import { Schema, model, models } from 'mongoose';

export interface IPushSubscription {
  _id?: string;
  userId: string;
  endpoint: string;
  auth: string;
  p256dh: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    auth: {
      type: String,
      required: true,
    },
    p256dh: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const PushSubscription =
  models.PushSubscription || model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
