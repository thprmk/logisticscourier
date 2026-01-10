// lib/dbConnect.ts
import mongoose from 'mongoose';
import Manifest from '@/models/Manifest.model';
import Shipment from '@/models/Shipment.model';
import Tenant from '@/models/Tenant.model';
import User from '@/models/User.model';
import Notification from '@/models/Notification.model';
import PushSubscription from '@/models/PushSubscription.model';
// Pricing module models
import WeightTier from '@/models/WeightTier.model';
import Zone from '@/models/Zone.model';
import ZoneSurcharge from '@/models/ZoneSurcharge.model';
import CorporateClient from '@/models/CorporateClient.model';
import { env } from './env';

// Use validated environment variable
const MONGODB_URI = env.MONGODB_URI;

 
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
      // ✅ OPTIMIZED: Configure connection pool for better performance
      maxPoolSize: 50,        // Maximum connections in pool (default: 10)
      minPoolSize: 5,         // Minimum connections to maintain
      maxIdleTimeMS: 30000,    // Close idle connections after 30s
      serverSelectionTimeoutMS: 2000,  // Reduced timeout for faster failure (was 5000)
      socketTimeoutMS: 30000,  // Reduced socket timeout (was 45000)
      connectTimeoutMS: 2000,  // Connection timeout
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
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