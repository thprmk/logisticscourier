'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/UserContext';
import toast from 'react-hot-toast';

export default function PWASetup() {
  const { user } = useUser();
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Register Service Worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          // Also load push notification handlers
          registration.scope;
          // The push handlers will be loaded from next-pwa's sw.js
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  // Request notification permission when user logs in
  // Show for: delivery staff, admins, and dispatchers who need push notifications
  useEffect(() => {
    if (user && (user.role === 'delivery_staff' || user.role === 'staff' || user.role === 'admin' || user.role === 'dispatcher') && !isInstalled) {
      // Wait a moment before showing the prompt for better UX
      const timer = setTimeout(() => {
        if ('Notification' in window) {
          // 👇 FIX: Only show prompt if permission has NOT been asked yet
          // Don't show if already granted or denied
          if (Notification.permission === 'default') {
            setShowPermissionPrompt(true);
          }
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, isInstalled]);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported on this device');
      return;
    }

    try {
      // Check if permission was already denied
      if (Notification.permission === 'denied') {
        toast.error('Notification permission was denied. Please enable it in browser settings.');
        setShowPermissionPrompt(false);
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);

      if (permission === 'granted') {
        console.log('Notification permission granted');
        try {
          await subscribeToNotifications();
          toast.success('Notifications enabled successfully');
          setShowPermissionPrompt(false);
        } catch (subError: any) {
          console.error('Subscription error:', subError);
          toast.error(`Subscription failed: ${subError.message}`);
        }
      } else if (permission === 'denied') {
        toast.error('You denied notification permission. Enable it in browser settings.');
      } else {
        toast.error('Notification permission dismissed');
      }
    } catch (error: any) {
      console.error('Error requesting notification permission:', error);
      toast.error(`Permission error: ${error.message}`);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        console.error('Service Worker not supported');
        throw new Error('Service workers are not supported in this browser');
      }
      
      if (!('PushManager' in window)) {
        console.error('PushManager not available');
        throw new Error('Push notifications are not supported in this browser');
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready:', registration);

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      console.log('Existing subscription:', subscription);

      if (!subscription) {
        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          console.error('VAPID public key not found in environment');
          throw new Error('VAPID public key not configured. Contact administrator.');
        }

        console.log('VAPID key found, subscribing...');
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
          });
          console.log('Successfully subscribed to push:', subscription);
        } catch (subError: any) {
          console.error('Push subscription failed:', subError.message);
          throw new Error(`Failed to subscribe: ${subError.message}`);
        }
      } else {
        console.log('Already subscribed, skipping push subscription');
      }

      // Send subscription to backend
      try {
        console.log('Saving subscription to backend...');
        console.log('Subscription data:', subscription.toJSON());
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(subscription.toJSON()),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Backend error:', errorData);
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        console.log('Subscription saved successfully to backend');
      } catch (fetchError: any) {
        console.error('Error saving subscription to backend:', fetchError);
        throw new Error(`Failed to save subscription: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
      throw error;
    }
  };

  const urlBase64ToUint8Array = (base64String: string): BufferSource => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  // ... existing code ...

  if (!showPermissionPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Enable Notifications</h2>
          <p className="text-sm text-gray-600 mt-1">Get instant alerts for new deliveries</p>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-700 mb-4">
            Receive real-time notifications when new deliveries are assigned to you or when delivery statuses change.
          </p>
          <p className="text-xs text-gray-600 mb-6">
            You can manage notification permissions anytime in your device settings.
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => setShowPermissionPrompt(false)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleEnableNotifications}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}
