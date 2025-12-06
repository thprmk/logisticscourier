"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/context/UserContext';
import { Loader } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    // Wait for the session check to finish
    if (!loading) {
      if (user) {
        //  User is logged in! Send them to the right place
        if (user.role === 'superAdmin') {
          router.replace('/superadmin/dashboard');
        } else if (user.role === 'delivery_staff') {
          router.replace('/deliverystaff');
        } else {
          // Admins, Branch Admins, Dispatchers go here
          router.replace('/dashboard');
        }
      } else {
        //  No session found, NOW send to login
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // Show a loading screen while checking (prevents flashing the login page)
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-2">
        <Loader className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-sm font-medium text-gray-500">Netta Logistics...</p>
      </div>
    </div>
  );
}