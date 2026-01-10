// models/Zone.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface IZone extends Document {
  name: string;                   // Zone name (e.g., "Central Zone", "Metro Zone")
  description?: string;           // Optional description
  isActive: boolean;              // Whether this zone is currently active
  createdBy: Schema.Types.ObjectId; // User who created this zone
}

const ZoneSchema = new Schema<IZone>({
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Zone name must be at least 2 characters'],
    maxlength: [100, 'Zone name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
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

// Indexes
ZoneSchema.index({ name: 1 }, { unique: true });
ZoneSchema.index({ isActive: 1 });

// Prevent model re-compilation on every code change
const Zone = models.Zone || model<IZone>('Zone', ZoneSchema);

export default Zone;

