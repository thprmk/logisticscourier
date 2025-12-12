/**
 * Push Notification Handler for Service Worker
 * This file supplements the main service worker with push notification handling
 */

console.log('[Push-SW] Push notification handler loaded');

// Handle incoming push notifications
self.addEventListener('push', function(event) {
  console.log('[Push-SW] Push notification received:', event);

  if (!event.data) {
    console.warn('[Push-SW] Push notification received with no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
    console.log('[Push-SW] Notification data parsed:', notificationData);
  } catch (e) {
    // If data is not JSON, treat it as plain text
    console.log('[Push-SW] Data is not JSON, treating as text');
    notificationData = {
      title: 'Notification',
      body: event.data.text(),
    };
  }

  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: notificationData.data?.shipmentId || 'notification',
    requireInteraction: false,
    data: notificationData.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'Netta Logistics',
      options
    ).then(function() {
      console.log('[Push-SW] Notification displayed successfully');
    }).catch(function(error) {
      console.error('[Push-SW] Failed to display notification:', error);
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Push-SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/deliverystaff';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if a window with the target URL is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not found, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close button
self.addEventListener('notificationclose', function(event) {
  console.log('[Push-SW] Notification closed:', event.notification.tag);
});
