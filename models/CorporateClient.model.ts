// models/CorporateClient.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface ICorporateClient extends Document {
  companyName: string;          // Company name (unique)
  contactPerson: string;         // Primary contact person name
  email: string;                  // Contact email (unique)
  phone: string;                 // Contact phone number
  address: string;               // Company address
  creditLimit?: number;          // Maximum credit allowed (optional)
  paymentTerms?: string;          // Payment terms (e.g., "Net 30", "Net 60")
  outstandingAmount: number;     // Current outstanding amount
  isActive: boolean;             // Whether this client is currently active
  createdBy: Schema.Types.ObjectId; // User who created this client
}

const CorporateClientSchema = new Schema<ICorporateClient>({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters'],
    maxlength: [200, 'Company name cannot exceed 200 characters'],
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true,
    minlength: [2, 'Contact person name must be at least 2 characters'],
    maxlength: [100, 'Contact person name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9\-\+\s\(\)]+$/, 'Please provide a valid phone number'],
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [5, 'Address must be at least 5 characters'],
    maxlength: [500, 'Address cannot exceed 500 characters'],
  },
  creditLimit: {
    type: Number,
    min: [0, 'Credit limit cannot be negative'],
  },
  paymentTerms: {
    type: String,
    trim: true,
    maxlength: [50, 'Payment terms cannot exceed 50 characters'],
  },
  outstandingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Outstanding amount cannot be negative'],
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
CorporateClientSchema.index({ companyName: 1 }, { unique: true });
CorporateClientSchema.index({ email: 1 }, { unique: true });
CorporateClientSchema.index({ isActive: 1 });
CorporateClientSchema.index({ outstandingAmount: 1 });

// Prevent model re-compilation on every code change
const CorporateClient = models.CorporateClient || model<ICorporateClient>('CorporateClient', CorporateClientSchema);

export default CorporateClient;

