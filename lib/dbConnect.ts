// lib/dbConnect.ts
import mongoose from 'mongoose';
import Manifest from '@/models/Manifest.model';
import Shipment from '@/models/Shipment.model';
import Tenant from '@/models/Tenant.model';
import User from '@/models/User.model';
import Notification from '@/models/Notification.model';
import PushSubscription from '@/models/PushSubscription.model';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

 
//  Global is used here to maintain a cached connection across hot reloads
//  in development. This prevents connections from growing exponentially
//  during API Route usage.

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // ✅ FIX: Configure connection pool for better concurrent user performance
      maxPoolSize: 50,        // Maximum connections in pool (default: 10)
      minPoolSize: 5,         // Minimum connections to maintain
      maxIdleTimeMS: 30000,    // Close idle connections after 30s
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      socketTimeoutMS: 45000,  // Close sockets after 45s of inactivity
    };
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;