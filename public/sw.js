// Service Worker for Netta Logistics PWA
// Handles push notifications and intelligent routing

const CACHE_NAME = 'netta-logistics-v1';
const URLS_TO_CACHE = [
  '/',
  '/deliverystaff',
  '/offline'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential files');
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        // If some URLs fail to cache, continue anyway
        console.warn('[Service Worker] Some URLs failed to cache');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let notificationData = {
    title: 'Netta Logistics',
    body: 'New update',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'netta-notification',
    requireInteraction: true
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        data: data.data || {}
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  console.log('[Service Worker] Showing notification:', notificationData);
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      vibrate: [200, 100, 200],
      sound: '/notification-sound.mp3'
    })
  );
});

// Notification click event - open app and navigate intelligently
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked', event.notification.data);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/deliverystaff';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          console.log('[Service Worker] App already open, focusing and navigating');
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      
      // App not open, open it and navigate to the URL
      if (clients.openWindow) {
        console.log('[Service Worker] Opening app and navigating to:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (optional - for retrying failed requests)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/sync', { method: 'POST', credentials: 'include' })
        .then(response => {
          console.log('[Service Worker] Sync completed');
        })
        .catch(error => {
          console.error('[Service Worker] Sync failed:', error);
          throw error; // Retry
        })
    );
  }
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For API calls, use network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline' }),
          { status: 503, statusText: 'Service Unavailable' }
        );
      })
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/offline').catch(() => {
            return new Response('Offline - Please try again later', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
    })
  );
});
