# Notifications & Push Notifications Flow - Visual Diagrams

## 1. User Login & Permission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Login                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │   PWASetup Component Loads     │
        └────────────┬───────────────────┘
                     │
        ┌────────────▼───────────────────┐
        │ Check Notification Permission  │
        └────────────┬───────────────────┘
                     │
        ┌────────────┴────────────┬─────────────┐
        │                         │             │
        ▼                         ▼             ▼
   'granted'                  'default'      'denied'
        │                         │             │
        ▼                         ▼             ▼
   Auto-subscribe         Show Modal       Do Nothing
   (silently)             (2s delay)       (respect user)
        │                         │
        └─────────────┬───────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ subscribeToNotifications()   │
        │ - Get SW registration       │
        │ - pushManager.subscribe()   │
        │ - Send to backend           │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ POST /api/notifications/    │
        │       subscribe              │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Validate JWT & Parse Keys   │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Save PushSubscription to DB │
        │ { userId, endpoint, keys }  │
        └─────────────────────────────┘
```

---

## 2. Shipment Status Update & Notification Trigger

```
┌───────────────────────────────────────────────────────────┐
│  Delivery Staff Updates Shipment Status                   │
│  (e.g., "Delivered", "Failed", "Out for Delivery")       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ PATCH /api/shipments/[id]  │
        └────────────┬───────────────┘
                     │
        ┌────────────▼───────────────────────────┐
        │ Determine notification event type      │
        ├────────────────────────────────────────┤
        │ status = 'Delivered'                   │
        │   → event = 'delivered'                │
        │                                        │
        │ status = 'Failed'                      │
        │   → event = 'delivery_failed'          │
        │                                        │
        │ status = 'Assigned'                    │
        │   → event = 'delivery_assigned'        │
        └────────────┬───────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ dispatchNotification({          │
        │   event,                        │
        │   shipmentId,                   │
        │   trackingId,                   │
        │   tenantId,                     │
        │   assignedStaffId               │
        │ })                              │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ Route to appropriate handler:  │
        │ - handleDelivered()            │
        │ - handleDeliveryFailed()       │
        │ - handleDeliveryAssigned()     │
        └────────────┬───────────────────┘
```

---

## 3. Notification Handling (Delivered Example)

```
┌────────────────────────────────────────┐
│ handleDelivered(context)               │
└────────────────┬───────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ Find all admins & dispatchers │
        │ for this tenant               │
        └────────┬──────────────────────┘
                 │
        ┌────────▼──────────────────────────────┐
        │ For EACH admin/dispatcher:            │
        ├──────────────────────────────────────┤
        │ 1. Create in-app notification record │
        │    in Notification collection        │
        │                                      │
        │ 2. sendShipmentNotification(userId)  │
        │    - Find PushSubscription(s)        │
        │    - For each subscription:          │
        │       a) Prepare encrypted payload   │
        │       b) webpush.sendNotification()  │
        │       c) Log success/failure         │
        │       d) If 410/404, delete sub      │
        └────────┬──────────────────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ Also notify assigned staff:   │
        │ sendShipmentNotification()    │
        │ (same process as admin)       │
        └──────────────────────────────┘
```

---

## 4. Push Notification Delivery Flow

```
┌──────────────────────────────────────┐
│ webpush.sendNotification()           │
│ - Endpoint: https://fcm.../...       │
│ - Keys: { auth, p256dh }             │
│ - Payload: encrypted JSON            │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ Push Service (FCM/APNs)    │
        │ - Validates signature      │
        │ - Queues for delivery      │
        │ - Holds for offline users  │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Browser receives push data │
        │ (even if tab is closed)    │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ Service Worker 'push' event    │
        │ in public/push-sw.js           │
        └────────────┬───────────────────┘
                     │
        ┌────────────▼───────────────────┐
        │ 1. Decrypt payload             │
        │ 2. Extract {title, body, data} │
        │ 3. Prepare notification options│
        │ 4. showNotification()          │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌───────────────────────────────┐
        │ Windows Desktop Notification  │
        │ appears on taskbar 🔔         │
        └───────────────────────────────┘
```

---

## 5. Notification Click & Navigation

```
┌──────────────────────────────┐
│ User clicks notification     │
│ on Windows desktop           │
└────────────────┬─────────────┘
                 │
                 ▼
        ┌──────────────────────────────┐
        │ Service Worker               │
        │ 'notificationclick' event    │
        │ in public/push-sw.js         │
        └────────────┬─────────────────┘
                     │
        ┌────────────▼────────────────┐
        │ Get URL from notification   │
        │ data (e.g., /dashboard)     │
        └────────────┬────────────────┘
                     │
        ┌────────────▼──────────────────┐
        │ Check existing windows for   │
        │ that URL                     │
        └────────────┬──────────────────┘
                     │
        ┌────────────┴──────────────┐
        │                           │
        ▼                           ▼
    Found                       Not found
        │                           │
        ▼                           ▼
    Focus                      Open new
    window                      window
```

---

## 6. Complete End-to-End Timeline

```
Time  Component           Action                     Log Output
─────────────────────────────────────────────────────────────────────────

T0    Browser            User logs in
      PWASetup.tsx       Checks permission
                         → permission === 'granted'
                         
                         [PWASetup] User role: admin
                         [PWASetup] Permission already 
                                   granted, subscribing...

T1    PWASetup.tsx       subscribeToNotifications()
      
      Service Worker     Registers /sw.js
                         
                         [PWASetup] Service Worker ready
                         [PWASetup] Starting subscription...
                         [PWASetup] Successfully subscribed

T2    API                POST /api/notifications/subscribe
      
                         [Subscribe API] Received request
                         [Subscribe API] Subscription saved
                         
      Database           Insert PushSubscription
                         { userId, endpoint, auth, p256dh }

T3    Delivery Staff     Updates shipment status
      App                → PATCH /api/shipments/123
      
      Validation         Extract status = 'Delivered'
                         → Determine event = 'delivered'

T4    Notification       dispatchNotification() called
      Dispatcher         
                         Processing event: delivered
                         Find admins for tenant
                         
                         → Call handleDelivered()

T5    Handle Delivered   Find all admins (2 found)
      
      For Admin #1       sendShipmentNotification(admin1Id)
                         
                         Find PushSubscription for admin1
                         [Notifications] Found: 1 subscription
                         
                         webpush.sendNotification()
                         
                         [Notifications] Successfully sent to:
                                        https://fcm...xyz...

T6    For Admin #2       Same process as Admin #1
      
                         [Notifications] Successfully sent to:
                                        https://fcm...abc...

T7    Push Service       (FCM) Queues notifications
                         Routes to browser

T8    Browser            Receives push event
      Service Worker     'push' event triggered
      (push-sw.js)       
                         [Push-SW] Push notification received
                         [Push-SW] Showing notification with title:
                                  Delivery: TRK-123456

T9    Operating System   Windows Notification appears 🔔
                         "Delivery completed"
                         Netta Logistics

T10   User               Clicks notification on desktop

T11   Service Worker     'notificationclick' event
      (push-sw.js)       Gets URL from notification.data
                         
                         Focuses or opens app window

T12   App                Opens /dashboard with shipment context
```

---

## 7. Database Schema for Push Subscriptions

```
PushSubscription Collection
├─ _id: ObjectId
├─ userId: String (indexed for quick lookup)
│           └─ References User._id
├─ endpoint: String (unique, from browser)
│            └─ Format: https://fcm.googleapis.com/...
├─ auth: String (encryption key from subscription)
├─ p256dh: String (encryption key from subscription)
├─ createdAt: Date
└─ updatedAt: Date

Example:
{
  _id: ObjectId("..."),
  userId: "user-admin-123",
  endpoint: "https://fcm.googleapis.com/...",
  auth: "abcd1234efgh5678...",
  p256dh: "xyz9876uv...",
  createdAt: 2025-12-08T10:00:00Z,
  updatedAt: 2025-12-08T10:00:00Z
}
```

---

## 8. Message Flow Summary

```
Client Side               Network              Server Side
───────────────────────────────────────────────────────────

User Login
  │
  └─→ PWASetup checks
      permission
        │
        └─→ Auto-subscribe
            or show modal
              │
              └──────────────→ POST /api/notifications/
                               subscribe
                                 │
                                 └──→ Validate JWT
                                 └──→ Save subscription
                                 └──→ Return success
                                      │
                                      └──────┐
                                             │
                                             ▼
                                    PushSubscription
                                    saved to DB


                                Delivery Staff
                                Updates Shipment
                                    │
                                    └─→ PATCH /api/shipments/123
                                        │
                                        └─→ Trigger dispatchNotification()
                                            │
                                            └─→ handleDelivered()
                                                │
                                                ├─→ Find admins
                                                │
                                                ├─→ sendShipmentNotification()
                                                │   │
                                                │   └─→ Find subscriptions
                                                │
                                                └─→ webpush.sendNotification()
                                                    │
                                                    └─→ Push Service
                                                        (FCM/APNs)
                                                          │
Service Worker receives                                  │
'push' event ←─────────────────────────────────────────┘
  │
  └─→ showNotification()
      │
      └─→ Windows Notification 🔔
          │
          └─→ User clicks
              │
              └─→ 'notificationclick' event
                  │
                  └─→ Open app with shipment
```

---

## 9. Error Handling Flow

```
┌─────────────────────────────────────────┐
│ Push Notification Sending               │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
SUCCESS (200)            ERROR (4xx/5xx)
    │                         │
    ▼                         ▼
Log success            Check error code
Return results              │
                    ┌───────┴────────┐
                    │                │
                    ▼                ▼
                 410/404         Other errors
                (Expired)        (Network, etc)
                    │                │
                    ▼                ▼
             Delete subscription  Log & continue
             Remove invalid        (retry later)
             subscription
```

---

## Key Files in This Flow

1. **Client-Side (Browser)**
   - `app/components/PWASetup.tsx` - Permission handling & subscription
   - `public/sw.js` - Service worker registration
   - `public/push-sw.js` - Push event handling

2. **API Layer (Server)**
   - `/api/notifications/subscribe` - Save subscriptions
   - `/api/shipments/[id]` - Trigger notifications

3. **Business Logic (Server)**
   - `app/lib/notificationDispatcher.ts` - Route notifications
   - `app/lib/notifications.ts` - Send push notifications

4. **Data Layer**
   - `models/PushSubscription.model.ts` - Store subscriptions
   - `models/Notification.model.ts` - In-app notifications

---

## Status Summary

✅ **All components implemented and connected**
✅ **All logging in place for debugging**
✅ **Error handling at each step**
✅ **Database persistence working**
✅ **Service worker properly configured**
✅ **VAPID encryption enabled**
✅ **Multi-user support (all roles)**
✅ **Production ready**
