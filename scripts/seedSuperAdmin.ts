// scripts/seedSuperAdmin.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.model';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Specify the file to load

const createSuperAdmin = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in your environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  try {
    const superAdminEmail = 'superadmin@logistics.com'; // Change this to your desired email
    const superAdminPassword = 'superpassword123';   // Change this to a secure temporary password

    const existingAdmin = await User.findOne({ email: superAdminEmail, role: 'superAdmin' });
    if (existingAdmin) {
      console.log('Super Admin with this email already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

    const superAdmin = new User({
      name: 'Platform Super Admin',
      email: superAdminEmail,
      password: hashedPassword,
      role: 'superAdmin',
    });

    await superAdmin.save();
    console.log('Super Admin created successfully.');
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Password: ${superAdminPassword} (Use this for your first login)`);

  } catch (error) {
    console.error('Error during Super Admin creation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

createSuperAdmin();