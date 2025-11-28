// models/User.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;                          // Hidden by default (select: false)
  role: 'superAdmin' | 'admin' | 'staff';   // User role type
  tenantId?: Schema.Types.ObjectId;         // Associated branch (null for superAdmin)
  createdAt?: Date;                         // Auto-generated
  updatedAt?: Date;                         // Auto-generated
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    required: true,
    enum: ['superAdmin', 'admin', 'staff'],
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
  },
}, { timestamps: true });

const User = models.User || model<IUser>('User', UserSchema);

export default User;