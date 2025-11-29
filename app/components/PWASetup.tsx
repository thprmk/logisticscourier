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

  // Request notification permission when user logs in as delivery staff
  useEffect(() => {
    if (user && (user.role === 'delivery_staff' || user.role === 'staff') && !isInstalled) {
      // Wait a moment before showing the prompt for better UX
      const timer = setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'default') {
          setShowPermissionPrompt(true);
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
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('Notification permission granted');
        await subscribeToNotifications();
        toast.success('Notifications enabled successfully');
        setShowPermissionPrompt(false);
      } else if (permission === 'denied') {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const subscribeToNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        toast.error('Push notifications are not supported on this device');
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          console.warn('VAPID public key not configured');
          toast.error('Notification system not properly configured');
          return;
        }

        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
          });
        } catch (subError: any) {
          console.error('Failed to subscribe to push manager:', subError);
          toast.error('Failed to enable push notifications');
          return;
        }
      }

      // Send subscription to backend
      try {
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            subscription: subscription.toJSON(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to save subscription');
        }

        console.log('Subscription saved successfully');
      } catch (fetchError: any) {
        console.error('Error saving subscription to backend:', fetchError);
        throw fetchError;
      }
    } catch (error) {
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
