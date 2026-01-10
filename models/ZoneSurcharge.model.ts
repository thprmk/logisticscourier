// models/ZoneSurcharge.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface IZoneSurcharge extends Document {
  fromZoneId: Schema.Types.ObjectId;  // Origin zone
  toZoneId: Schema.Types.ObjectId;    // Destination zone
  surcharge: number;                  // Additional cost in ₹
  isActive: boolean;                   // Whether this surcharge is currently active
  createdBy: Schema.Types.ObjectId;   // User who created this surcharge
}

const ZoneSurchargeSchema = new Schema<IZoneSurcharge>({
  fromZoneId: {
    type: Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Origin zone is required'],
    index: true,
  },
  toZoneId: {
    type: Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'Destination zone is required'],
    index: true,
  },
  surcharge: {
    type: Number,
    required: [true, 'Surcharge amount is required'],
    min: [0, 'Surcharge cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Compound unique index to prevent duplicate zone combinations
ZoneSurchargeSchema.index({ fromZoneId: 1, toZoneId: 1 }, { unique: true });
ZoneSurchargeSchema.index({ isActive: 1 });

// Custom validation: Ensure zones are valid
ZoneSurchargeSchema.pre('save', async function(next) {
  // Note: This validation assumes zones exist. In production, you might want to
  // add a check to verify both zones exist in the database
  if (this.fromZoneId.toString() === this.toZoneId.toString()) {
    // Same zone surcharge is allowed (for intra-zone shipping)
    // This is valid, so we proceed
  }
  next();
});

// Prevent model re-compilation on every code change
const ZoneSurcharge = models.ZoneSurcharge || model<IZoneSurcharge>('ZoneSurcharge', ZoneSurchargeSchema);

export default ZoneSurcharge;

