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
  tenantId: Schema.Types.ObjectId;      // CRUCIAL: The link to the Branch/Tenant (current branch)
  trackingId: string;                   // The unique ID for customers
  sender: IAddressDetails;
  recipient: IAddressDetails;
  packageInfo: {
    weight: number;                       // Weight of the package
    type: string;                         // e.g., 'Document', 'Parcel'
    details?: string;                     // Optional notes about the contents
  };
  originBranchId: Schema.Types.ObjectId;     // The branch where shipment was created
  destinationBranchId: Schema.Types.ObjectId; // The final destination branch
  currentBranchId: Schema.Types.ObjectId;    // The branch currently holding the shipment
  status: 'At Origin Branch' | 'In Transit to Destination' | 'At Destination Branch' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed'; // Controlled list of statuses
  assignedTo?: Schema.Types.ObjectId;     // Optional: The User ID of the assigned driver
  statusHistory: {
    status: string;
    timestamp: Date;
    notes?: string;
  }[];                                    // A log of all status changes
  deliveryProof?: {
    type: 'signature' | 'photo';
    url: string;                      // Vercel Blob URL instead of base64
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
  originBranchId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  destinationBranchId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  currentBranchId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  status: {
    type: String,
    enum: ['At Origin Branch', 'In Transit to Destination', 'At Destination Branch', 'Assigned', 'Out for Delivery', 'Delivered', 'Failed'],
    default: 'At Origin Branch',
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
    url: String,                     // Vercel Blob URL
  },
  failureReason: String,
}, { timestamps: true }); // Automatically adds 'createdAt' and 'updatedAt' fields

const Shipment = models.Shipment || model<IShipment>('Shipment', ShipmentSchema);

export default Shipment;