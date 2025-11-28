// models/Tenant.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;                             // Unique branch name
  createdAt?: Date;                         // Auto-generated
  updatedAt?: Date;                         // Auto-generated
}

const TenantSchema = new Schema<ITenant>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, { timestamps: true });

const Tenant = models.Tenant || model<ITenant>('Tenant', TenantSchema);

export default Tenant;