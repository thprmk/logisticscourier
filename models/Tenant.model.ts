// models/Tenant.model.ts

import { Schema, model, models, Document } from 'mongoose';

// This interface defines the shape of a tenant document for TypeScript
export interface ITenant extends Document {
  name: string;
}

// This is the Mongoose schema that defines the rules for the database
const TenantSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required.'],
    unique: true, // Each branch must have a unique name
  },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// This prevents the model from being re-compiled on every code change in development
const Tenant = models.Tenant || model<ITenant>('Tenant', TenantSchema);

export default Tenant;