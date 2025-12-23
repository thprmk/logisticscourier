/**
 * Service Worker for Netta Logistics PWA
 * Handles push notifications and offline caching
 */

// Import push notification handlers
try {
  importScripts('/push-sw.js');
  console.log('[SW] Push handlers imported successfully');
} catch (e) {
  console.error('[SW] Failed to import push handlers:', e);
}

// Service Worker version
const SW_VERSION = '1.0.1';
const CACHE_NAME = 'netta-cache-v1';

console.log('[SW] Service Worker starting... Version:', SW_VERSION);

// Install event - runs when service worker is first installed
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker... Version:', SW_VERSION);
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  // Don't cache files in development - just install
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('[SW] Service worker installed successfully');
    })
  );
});

// Activate event - runs when service worker becomes active
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker...');
  
  // Take control of all clients immediately
  event.waitUntil(
    clients.claim().then(function() {
      console.log('[SW] Service worker activated and claiming clients');
    })
  );
});

// Fetch event - network first strategy for mobile compatibility
self.addEventListener('fetch', function(event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Don't cache API calls or auth-related requests
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/login') ||
      event.request.url.includes('/auth')) {
    return;
  }
  
  // Network-first strategy for mobile compatibility
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        return response;
      })
      .catch(function(error) {
        console.log('[SW] Network request failed, trying cache:', event.request.url);
        return caches.match(event.request);
      })
  );
});

// Message event - receive messages from client
self.addEventListener('message', function(event) {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded successfully');



