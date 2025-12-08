"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/UserContext';
import { BellRing, Bell } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import toast from 'react-hot-toast';

// Helper function to convert VAPID key
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export function NotificationBell() {
  const { user } = useUser();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEligible, setIsEligible] = useState(false);

  // Check user eligibility and current permission status
  useEffect(() => {
    const eligibleRoles = ['delivery_staff', 'staff', 'admin', 'dispatcher'];
    const isUserEligible = user ? eligibleRoles.includes(user.role) : false;
    setIsEligible(isUserEligible);

    if (isUserEligible && 'Notification' in window) {
      setPermission(Notification.permission);
      // Also sync subscription if already granted
      if (Notification.permission === 'granted') {
        subscribeToNotifications();
      }
    }
  }, [user]);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;
    try {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission); // Update state to hide the bell
      if (newPermission === 'granted') {
        toast.success('Notifications enabled!');
        await subscribeToNotifications();
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator && 'PushManager' in window)) return;
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return;
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription.toJSON()),
      });
      console.log('Subscription successfully synced to backend.');
    } catch (error) {
      console.error('Subscription failed:', error);
    }
  };
  
  // Only show the bell if the user is eligible and hasn't granted permission yet
  if (!isEligible || permission !== 'default') {
    return null; // Don't render anything if not eligible or permission already set
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-500 hover:text-gray-900"
        >
          <Bell className="h-5 w-5" />
          {/* Glowing dot to attract attention */}
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Enable Notifications</h4>
            <p className="text-sm text-muted-foreground">
              Get real-time alerts for important shipment updates.
            </p>
          </div>
          <Button onClick={handleEnableNotifications}>Enable</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}