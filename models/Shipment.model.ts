    // models/Shipment.model.ts

import { Schema, model, models, Document } from 'mongoose';

interface IAddressDetails {
  name: string;
  address: string;
  phone: string;
}

export interface IShipment extends Document {
  tenantId: Schema.Types.ObjectId;           // Current branch holding shipment
  trackingId: string;                        // Unique customer-facing identifier
  sender: IAddressDetails;                   // Pickup location
  recipient: IAddressDetails;                // Delivery location
  packageInfo: {
    weight: number;                          // Package weight in kg
    type: string;                            // Package type (Parcel, Document, Fragile)
    details?: string;                        // Optional content notes
  };
  originBranchId: Schema.Types.ObjectId;     // Source branch
  destinationBranchId: Schema.Types.ObjectId;// Target branch
  currentBranchId: Schema.Types.ObjectId;    // Current physical location
  status: 'At Origin Branch' | 'In Transit' | 'At Destination Branch' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed';
  assignedTo?: Schema.Types.ObjectId;        // Assigned delivery staff
  statusHistory: {
    status: string;
    timestamp: Date;
    notes?: string;                          // Status change notes
  }[];
  deliveryProof?: {
    type: 'signature' | 'photo';
    url: string;                             // Cloud storage URL
  };
  failureReason?: string;                    // Delivery failure reason
  createdAt?: Date;                          // Auto-generated
  updatedAt?: Date;                          // Auto-generated
}

const AddressDetailsSchema = new Schema<IAddressDetails>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
}, { _id: false });

const ShipmentSchema = new Schema<IShipment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  trackingId: { type: String, required: true, unique: true, index: true },
  sender: { type: AddressDetailsSchema, required: true },
  recipient: { type: AddressDetailsSchema, required: true },
  packageInfo: {
    weight: { type: Number, required: true, min: 0 },
    type: { type: String, required: true },
    details: String,
  },
  originBranchId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  destinationBranchId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  currentBranchId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  status: {
    type: String,
    enum: ['At Origin Branch', 'In Transit', 'At Destination Branch', 'Assigned', 'Out for Delivery', 'Delivered', 'Failed'],
    default: 'At Origin Branch',
    required: true,
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String,
  }],
  deliveryProof: {
    type: { type: String, enum: ['signature', 'photo'] },
    url: String,
  },
  failureReason: String,
}, { timestamps: true });

const Shipment = models.Shipment || model<IShipment>('Shipment', ShipmentSchema);

export default Shipment;