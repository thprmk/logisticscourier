'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);
  const hasShownPromptRef = useRef(false);
  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Check notification permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = Notification.permission;
      setNotificationPermission(permission);
      console.log('[PWASetup] Notification permission status:', permission);
    }
  }, []);

  // Request notification permission when user logs in
  // Show for: delivery staff, admins, and dispatchers who need push notifications
  useEffect(() => {
    console.log('[PWASetup] User check - user:', user?.email, 'role:', user?.role, 'isInstalled:', isInstalled, 'isMobile:', isMobile, 'permission:', notificationPermission, 'hasShownPrompt:', hasShownPromptRef.current);
    
    // Only show for valid roles (staff = delivery staff, admin includes dispatchers)
    const validRoles = ['staff', 'admin', 'superAdmin'];
    if (!user || !validRoles.includes(user.role || '')) {
      console.log('[PWASetup] User not logged in or invalid role, skipping prompt');
      setShowPermissionPrompt(false);
      return;
    }

    // Prevent showing prompt multiple times
    if (hasShownPromptRef.current) {
      console.log('[PWASetup] Prompt already shown, skipping');
      return;
    }

    // Clear any existing timer
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
    }

    // Wait a moment before showing the prompt for better UX
    promptTimerRef.current = setTimeout(() => {
      console.log('[PWASetup] Checking notification support...');
      
      if (!('Notification' in window)) {
        console.log('[PWASetup] Notifications not supported in this browser');
        setShowPermissionPrompt(false);
        return;
      }

      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission);
      console.log('[PWASetup] Current Notification.permission:', currentPermission);
      
      // Only show prompt if permission has NOT been asked yet and we haven't shown it before
      if (currentPermission === 'default' && !hasShownPromptRef.current) {
        console.log('[PWASetup] Permission is default, showing prompt');
        hasShownPromptRef.current = true;
        setShowPermissionPrompt(true);
      } else if (currentPermission === 'granted') {
        console.log('[PWASetup] Permission already granted, auto-subscribing...');
        setShowPermissionPrompt(false);
        hasShownPromptRef.current = true; // Mark as shown to prevent re-prompting
        // Auto-subscribe if permission was already granted
        subscribeToNotifications().catch(err => {
          console.error('[PWASetup] Auto-subscribe failed:', err);
        });
      } else {
        console.log('[PWASetup] Permission was denied, not showing prompt');
        setShowPermissionPrompt(false);
        hasShownPromptRef.current = true; // Mark as shown to prevent re-prompting
      }
    }, 2000);

    return () => {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
      }
    };
  }, [user, isInstalled, isMobile]);

  const handleEnableNotifications = async () => {
    // Prevent multiple clicks
    if (isEnabling) {
      console.log('[PWASetup] Already processing, ignoring click');
      return;
    }

    console.log('[PWASetup] handleEnableNotifications called');
    
    if (!('Notification' in window)) {
      console.error('[PWASetup] Notifications not supported');
      toast.error('Notifications not supported on this device');
      return;
    }

    setIsEnabling(true);

    try {
      const currentPermission = Notification.permission;
      console.log('[PWASetup] Current permission:', currentPermission);
      
      // Check if permission was already granted
      if (currentPermission === 'granted') {
        console.log('[PWASetup] Permission already granted');
        setNotificationPermission('granted');
        setShowPermissionPrompt(false);
        // Still try to subscribe if not already subscribed
        try {
          await subscribeToNotifications();
          toast.success('Notifications enabled successfully');
        } catch (subError: any) {
          console.error('[PWASetup] Subscription error:', subError);
          // Don't show error if already subscribed, just show success
          if (!subError.message?.includes('already')) {
            toast.error(`Subscription failed: ${subError.message}`);
          } else {
            toast.success('Notifications enabled successfully');
          }
        }
        setIsEnabling(false);
        return;
      }

      // Check if permission was already denied
      if (currentPermission === 'denied') {
        console.log('[PWASetup] Permission already denied');
        setNotificationPermission('denied');
        toast.error('Notification permission was denied. Please enable it in browser settings.');
        setShowPermissionPrompt(false);
        setIsEnabling(false);
        return;
      }

      // Request permission
      console.log('[PWASetup] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[PWASetup] Permission result:', permission);
      
      // Update permission state immediately
      setNotificationPermission(permission);

      if (permission === 'granted') {
        console.log('[PWASetup] Notification permission granted');
        try {
          await subscribeToNotifications();
          // Show success toast
          toast.success('Notifications enabled successfully!', {
            duration: 4000,
          });
          // Close dialog immediately
          setShowPermissionPrompt(false);
          hasShownPromptRef.current = true; // Mark as shown to prevent re-prompting
        } catch (subError: any) {
          console.error('[PWASetup] Subscription error:', subError);
          // Even if subscription fails, permission was granted, so show success
          toast.success('Notification permission enabled!', {
            duration: 4000,
          });
          setShowPermissionPrompt(false);
          // Log the subscription error but don't show it to user
          console.warn('[PWASetup] Subscription failed but permission granted:', subError);
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
    } finally {
      setIsEnabling(false);
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
        // Don't show toast here, let the main handler show success
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
          // Don't show toast here, let the main handler show success
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
      <DialogContent 
        className="bg-white rounded-lg shadow-xl max-w-xs p-4 border-0 gap-0"
        overlayClassName="bg-gray-900/20 [backdrop-filter:blur(4px)]"
        showCloseButton={true}
      >
        {/* Centered Icon */}
        <div className="flex justify-center mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
            <BellRing className="w-5 h-5 text-blue-600" strokeWidth={2} />
          </div>
        </div>

        {/* Title Only */}
        <DialogHeader className="text-center sm:text-center mb-2 px-0 gap-0">
          <DialogTitle className="text-sm font-bold text-gray-900">Enable Notifications</DialogTitle>
        </DialogHeader>

        {/* Brief Description */}
        <p className="text-center text-xs text-gray-600 mb-4 leading-relaxed">
          Get instant alerts for new assignments and critical updates on your device.
        </p>

        {/* Buttons - Side by Side with proper touch targets for mobile */}
        <div className="flex gap-2 justify-center items-center">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[PWASetup] Enable button clicked');
              handleEnableNotifications();
            }}
            disabled={isEnabling || notificationPermission === 'granted'}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold px-5 py-1.5 text-xs rounded-md transition-colors min-h-[40px] touch-manipulation"
          >
            {isEnabling ? 'Enabling...' : notificationPermission === 'granted' ? 'Enabled ✓' : 'Enable'}
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[PWASetup] Later button clicked');
              setShowPermissionPrompt(false);
              hasShownPromptRef.current = true; // Mark as shown to prevent re-prompting
            }}
            variant="outline"
            className="text-gray-700 font-semibold px-5 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[40px] touch-manipulation"
          >
            Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
