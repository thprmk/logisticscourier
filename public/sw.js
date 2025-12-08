/**
 * Minimal Service Worker for Netta Logistics
 * Handles push notifications via imported handlers
 */

console.log('[SW] Service Worker starting...');

// Import push notification handlers
importScripts('/push-sw.js');

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  self.clients.claim();
});

console.log('[SW] Service Worker ready for push notifications');
