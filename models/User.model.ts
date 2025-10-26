// models/User.model.ts

import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // The '?' makes it optional, as we won't always send it
  role: 'superAdmin' | 'admin' | 'staff'; // Defines the allowed roles
  tenantId?: Schema.Types.ObjectId; // The link to the Tenant/Branch
}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { 
    type: String, 
    required: true, 
    select: false // A crucial security feature: Hides the password from queries by default
  },
  role: {
    type: String,
    required: true,
    enum: ['superAdmin', 'admin', 'staff'],
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant', // This tells Mongoose that this ID refers to a document in the 'Tenant' collection
  },
}, { timestamps: true });

const User = models.User || model<IUser>('User', UserSchema);

export default User;