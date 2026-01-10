// models/WeightTier.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface IWeightTier extends Document {
  minWeight: number;              // Minimum weight in kg (inclusive)
  maxWeight: number;              // Maximum weight in kg (exclusive, except for last tier)
  price: number;                  // Base price in ₹
  isActive: boolean;              // Whether this tier is currently active
  createdBy: Schema.Types.ObjectId; // User who created this tier
}

const WeightTierSchema = new Schema<IWeightTier>({
  minWeight: {
    type: Number,
    required: [true, 'Minimum weight is required'],
    min: [0, 'Minimum weight cannot be negative'],
  },
  maxWeight: {
    type: Number,
    required: [true, 'Maximum weight is required'],
    min: [0, 'Maximum weight cannot be negative'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
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

// Compound index for quick weight lookups
WeightTierSchema.index({ minWeight: 1, maxWeight: 1 });
WeightTierSchema.index({ isActive: 1 });

// Custom validation: Ensure maxWeight > minWeight
WeightTierSchema.pre('save', function(next) {
  if (this.maxWeight <= this.minWeight) {
    next(new Error('Maximum weight must be greater than minimum weight'));
  } else {
    next();
  }
});

// Prevent model re-compilation on every code change
const WeightTier = models.WeightTier || model<IWeightTier>('WeightTier', WeightTierSchema);

export default WeightTier;

