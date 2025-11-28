// models/Manifest.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface IManifest extends Document {
  fromBranchId: Schema.Types.ObjectId;      // Source branch
  toBranchId: Schema.Types.ObjectId;        // Destination branch
  shipmentIds: Schema.Types.ObjectId[];     // Shipments in manifest
  status: 'In Transit' | 'Completed';       // Current status
  vehicleNumber?: string;                   // Vehicle identifier
  driverName?: string;                      // Driver details
  dispatchedAt: Date;                       // Dispatch timestamp
  receivedAt?: Date;                        // Delivery timestamp
  notes?: string;                           // Additional notes
  createdAt?: Date;                         // Auto-generated
  updatedAt?: Date;                         // Auto-generated
}

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
  vehicleNumber: String,
  driverName: String,
  dispatchedAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  },
  receivedAt: Date,
  notes: String,
}, { timestamps: true });

const Manifest = models.Manifest || model<IManifest>('Manifest', ManifestSchema);

export default Manifest;
