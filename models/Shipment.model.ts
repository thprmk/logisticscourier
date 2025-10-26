    // models/Shipment.model.ts

import { Schema, model, models, Document } from 'mongoose';

// Interface for Sender/Recipient details, to keep our main interface clean
interface IAddressDetails {
  name: string;
  address: string;
  phone: string;
}

// This is the main TypeScript interface for a Shipment document
export interface IShipment extends Document {
  tenantId: Schema.Types.ObjectId;      // CRUCIAL: The link to the Branch/Tenant
  trackingId: string;                   // The unique ID for customers
  sender: IAddressDetails;
  recipient: IAddressDetails;
  packageInfo: {
    weight: number;                       // Weight of the package
    type: string;                         // e.g., 'Document', 'Parcel'
    details?: string;                     // Optional notes about the contents
  };
  status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed'; // Controlled list of statuses
  assignedTo?: Schema.Types.ObjectId;     // Optional: The User ID of the assigned driver
  statusHistory: {
    status: string;
    timestamp: Date;
    notes?: string;
  }[];                                    // A log of all status changes
  deliveryProof?: {
    type: 'signature' | 'photo';
    dataUrl: string;                      // Will store the image data or a URL to the image
  };
  failureReason?: string;
}

// This is the Mongoose Schema for the nested address details
const AddressDetailsSchema = new Schema<IAddressDetails>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
}, { _id: false }); // '_id: false' prevents Mongoose from adding a separate ID to the address objects

// This is the main Mongoose Schema that enforces the rules in the database
const ShipmentSchema = new Schema<IShipment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  trackingId: { type: String, required: true, unique: true, index: true },
  sender: { type: AddressDetailsSchema, required: true },
  recipient: { type: AddressDetailsSchema, required: true },
  packageInfo: {
    weight: { type: Number, required: true },
    type: { type: String, required: true },
    details: { type: String },
  },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Out for Delivery', 'Delivered', 'Failed'],
    default: 'Pending',
    required: true,
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }, // This links to a User document
  statusHistory: [{
    status: String,
    timestamp: Date,
    notes: String,
  }],
  deliveryProof: {
    type: { type: String, enum: ['signature', 'photo'] },
    dataUrl: String,
  },
  failureReason: String,
}, { timestamps: true }); // Automatically adds 'createdAt' and 'updatedAt' fields

const Shipment = models.Shipment || model<IShipment>('Shipment', ShipmentSchema);

export default Shipment;