'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/UserContext';
import { BellRing } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import toast from 'react-hot-toast';

export default function PWASetup() {
  const { user } = useUser();
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      console.log('[PWASetup] Device type:', mobile ? 'Mobile' : 'Desktop');
    };
    checkMobile();
  }, []);

  // Register Service Worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('[PWASetup] Registering service worker...');
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWASetup] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWASetup] Service Worker registration failed:', error);
        });
    } else {
      console.log('[PWASetup] Service Worker not supported');
    }

    // Check if app is already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;  // iOS check
    if (isStandalone) {
      console.log('[PWASetup] App is running as installed PWA');
      setIsInstalled(true);
    } else {
      console.log('[PWASetup] App is running in browser');
    }
  }, []);

  // Request notification permission when user logs in
  // Show for: delivery staff, admins, and dispatchers who need push notifications
  useEffect(() => {
    console.log('[PWASetup] User check - user:', user?.email, 'role:', user?.role, 'isInstalled:', isInstalled, 'isMobile:', isMobile);
    
    // Only show for valid roles
    const validRoles = ['delivery_staff', 'staff', 'admin', 'dispatcher'];
    if (!user || !validRoles.includes(user.role || '')) {
      console.log('[PWASetup] User not logged in or invalid role, skipping prompt');
      return;
    }

    // Wait a moment before showing the prompt for better UX
    const timer = setTimeout(() => {
      console.log('[PWASetup] Checking notification support...');
      
      if (!('Notification' in window)) {
        console.log('[PWASetup] Notifications not supported in this browser');
        return;
      }

      console.log('[PWASetup] Current Notification.permission:', Notification.permission);
      
      // Only show prompt if permission has NOT been asked yet
      if (Notification.permission === 'default') {
        console.log('[PWASetup] Permission is default, showing prompt');
        setShowPermissionPrompt(true);
      } else if (Notification.permission === 'granted') {
        console.log('[PWASetup] Permission already granted, auto-subscribing...');
        // Auto-subscribe if permission was already granted
        subscribeToNotifications().catch(err => {
          console.error('[PWASetup] Auto-subscribe failed:', err);
        });
      } else {
        console.log('[PWASetup] Permission was denied, not showing prompt');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isInstalled, isMobile]);

  const handleEnableNotifications = async () => {
    console.log('[PWASetup] handleEnableNotifications called');
    
    if (!('Notification' in window)) {
      console.error('[PWASetup] Notifications not supported');
      toast.error('Notifications not supported on this device');
      return;
    }

    try {
      console.log('[PWASetup] Current permission:', Notification.permission);
      
      // Check if permission was already denied
      if (Notification.permission === 'denied') {
        console.log('[PWASetup] Permission already denied');
        toast.error('Notification permission was denied. Please enable it in browser settings.');
        setShowPermissionPrompt(false);
        return;
      }

      // Request permission
      console.log('[PWASetup] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[PWASetup] Permission result:', permission);

      if (permission === 'granted') {
        console.log('[PWASetup] Notification permission granted');
        try {
          await subscribeToNotifications();
          toast.success('Notifications enabled successfully');
          setShowPermissionPrompt(false);
        } catch (subError: any) {
          console.error('[PWASetup] Subscription error:', subError);
          toast.error(`Subscription failed: ${subError.message}`);
        }
      } else if (permission === 'denied') {
        console.log('[PWASetup] Permission denied by user');
        toast.error('You denied notification permission. Enable it in browser settings.');
        setShowPermissionPrompt(false);
      } else {
        console.log('[PWASetup] Permission dismissed');
        toast.error('Notification permission dismissed');
      }
    } catch (error: any) {
      console.error('[PWASetup] Error requesting notification permission:', error);
      toast.error(`Permission error: ${error.message}`);
    }
  };

  const subscribeToNotifications = async () => {
    console.log('[PWASetup] subscribeToNotifications called');
    
    try {
      // Check for iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (window.navigator as any).standalone === true 
        || window.matchMedia('(display-mode: standalone)').matches;
      
      if (isIOS && !isStandalone) {
        console.log('[PWASetup] iOS detected but not installed as PWA');
        // On iOS, we can still show in-app notifications, just not push
        toast.success('For push notifications, add this app to your Home Screen');
        return; // Don't throw error, just return gracefully
      }
      
      if (!('serviceWorker' in navigator)) {
        console.error('[PWASetup] Service Worker not supported');
        throw new Error('Service workers are not supported in this browser');
      }
      
      if (!('PushManager' in window)) {
        console.error('[PWASetup] PushManager not available');
        // For iOS Safari without PWA, this is expected
        if (isIOS) {
          toast.success('Notifications will appear in-app');
          return;
        }
        throw new Error('Push notifications are not supported in this browser');
      }

      console.log('[PWASetup] Waiting for service worker ready...');
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log('[PWASetup] Service Worker ready:', registration);

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      console.log('[PWASetup] Existing subscription:', subscription);

      if (!subscription) {
        // Subscribe to push notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        console.log('[PWASetup] VAPID key exists:', !!vapidPublicKey);

        if (!vapidPublicKey) {
          console.error('[PWASetup] VAPID public key not found in environment');
          throw new Error('VAPID public key not configured. Contact administrator.');
        }

        console.log('[PWASetup] VAPID key found, subscribing...');
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
          });
          console.log('[PWASetup] Successfully subscribed to push:', subscription);
        } catch (subError: any) {
          console.error('[PWASetup] Push subscription failed:', subError.message);
          throw new Error(`Failed to subscribe: ${subError.message}`);
        }
      } else {
        console.log('[PWASetup] Already subscribed, using existing subscription');
      }

      // Send subscription to backend
      try {
        console.log('[PWASetup] Saving subscription to backend...');
        const subscriptionData = subscription.toJSON();
        console.log('[PWASetup] Subscription data:', JSON.stringify(subscriptionData));
        
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(subscriptionData),
        });

        console.log('[PWASetup] Backend response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[PWASetup] Backend error:', errorData);
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('[PWASetup] Subscription saved successfully to backend:', result);
      } catch (fetchError: any) {
        console.error('[PWASetup] Error saving subscription to backend:', fetchError);
        throw new Error(`Failed to save subscription: ${fetchError.message}`);
      }
    } catch (error: any) {
      console.error('[PWASetup] Error subscribing to notifications:', error);
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

  return (
    <Dialog open={showPermissionPrompt} onOpenChange={setShowPermissionPrompt}>
      <DialogContent className="backdrop-blur-sm bg-white/95 max-w-xs p-4">
        {/* Centered Icon */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
            <BellRing className="w-6 h-6 text-blue-600" strokeWidth={2} />
          </div>
        </div>

        {/* Title Only */}
        <div className="text-center mb-3">
          <h2 className="text-base font-bold text-gray-900">Enable Notifications</h2>
        </div>

        {/* Brief Description */}
        <p className="text-center text-xs text-gray-600 mb-4">
          Get instant alerts for new assignments and critical updates on your device.
        </p>

        {/* Buttons - Side by Side with proper touch targets for mobile */}
        <div className="flex gap-2 justify-center">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[PWASetup] Enable button clicked');
              handleEnableNotifications();
            }}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-2 text-sm rounded-lg transition-colors min-h-[44px] touch-manipulation"
          >
            Enable
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[PWASetup] Later button clicked');
              setShowPermissionPrompt(false);
            }}
            variant="outline"
            className="text-gray-700 font-semibold px-6 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] touch-manipulation"
          >
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
