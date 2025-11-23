// models/Manifest.model.ts

import { Schema, model, models, Document } from 'mongoose';

// Interface for the Manifest document
export interface IManifest extends Document {
  fromBranchId: Schema.Types.ObjectId;      // The origin branch (e.g., Chennai)
  toBranchId: Schema.Types.ObjectId;        // The destination branch (e.g., Madurai)
  shipmentIds: Schema.Types.ObjectId[];     // Array of shipment IDs being transported
  status: 'In Transit' | 'Completed';       // Manifest status
  vehicleNumber?: string;                   // Optional: Truck/vehicle identifier
  driverName?: string;                      // Optional: Driver name
  dispatchedAt: Date;                       // When the manifest was created/dispatched
  receivedAt?: Date;                        // When the manifest was received at destination
  notes?: string;                           // Optional: Additional notes
}

// Mongoose Schema for Manifest
const ManifestSchema = new Schema<IManifest>({
  fromBranchId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true, 
    index: true 
  },
  toBranchId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true, 
    index: true 
  },
  shipmentIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true,
  }],
  status: {
    type: String,
    enum: ['In Transit', 'Completed'],
    default: 'In Transit',
    required: true,
  },
  vehicleNumber: { type: String },
  driverName: { type: String },
  dispatchedAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  receivedAt: { type: Date },
  notes: { type: String },
}, { timestamps: true });

// Prevent model re-compilation on every code change
const Manifest = models.Manifest || model<IManifest>('Manifest', ManifestSchema);

export default Manifest;
