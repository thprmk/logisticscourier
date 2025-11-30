# Push Notifications Not Showing - Troubleshooting Guide

## Problem
- ✅ In-app notifications (bell icon) working
- ❌ Browser push notifications (OS-level popups) NOT showing

---

## Quick Diagnostic Checklist

### Step 1: Verify VAPID Keys Setup
```bash
# Check if VAPID keys exist in .env.local
cat .env.local | grep VAPID
```

**Should see:**
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:<your-email>
```

**If missing:** Generate new keys
```bash
npx web-push generate-vapid-keys
# Then add to .env.local and restart dev server
```

---

### Step 2: Check Browser Console Logs

**Log in as delivery staff and check DevTools Console (F12)**

#### A. Service Worker Registration
```
✅ Good: "Service Worker registered: ServiceWorkerRegistration {...}"
❌ Bad: "Service Worker registration failed: [error]"
```

#### B. Permission Request
```
✅ Good: "Permission result: granted"
❌ Bad: "Permission result: denied"
```

#### C. Push Subscription
```
✅ Good: "Successfully subscribed to push: PushSubscription {...}"
❌ Bad: "VAPID public key not found in environment"
❌ Bad: "Push subscription failed: [error]"
```

#### D. Backend Save
```
✅ Good: "Subscription saved successfully to backend"
❌ Bad: "Backend error: {message: '...'}"
```

---

### Step 3: Check Browser Notification Permission

**In browser console, run:**
```javascript
console.log('Notification permission:', Notification.permission);
```

**Expected values:**
- `"granted"` ✅ = Permissions enabled
- `"denied"` ❌ = User clicked "Don't allow"
- `"default"` = Not asked yet

**If "denied":**
```
Chrome/Edge:
  1. Settings → Privacy & Security → Site Settings → Notifications
  2. Find "localhost:3000" or "localhost:3001"
  3. Change to "Allow"
  4. Refresh page

Firefox:
  1. about:preferences → Privacy & Security
  2. Find "localhost:3000" in Exceptions
  3. Change to "Allow"
```

---

### Step 4: Check Push Subscription in Database

**In MongoDB, run:**
```javascript
db.pushSubscriptions.findOne({ userId: "YOUR_STAFF_USER_ID" })
```

**Expected result:**
```javascript
{
  _id: ObjectId(...),
  userId: ObjectId("..."),
  endpoint: "https://fcm.googleapis.com/...",
  auth: "...",
  p256dh: "...",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**If not found:**
- Subscription wasn't saved to backend
- Check step 2 (Backend Save) logs
- Verify API endpoint working: `/api/notifications/subscribe`

---

### Step 5: Check Service Worker Status

**In browser console, run:**
```javascript
navigator.serviceWorker.getRegistrations()
  .then(regs => {
    regs.forEach(reg => {
      console.log('Scope:', reg.scope);
      console.log('Active:', !!reg.active);
      console.log('Registration:', reg);
    });
  });
```

**Expected:**
- Should show active service worker for `/`
- Status should be "activated and running"

**Or check DevTools:**
- DevTools → Application → Service Workers
- Should see `/sw.js` with status "activated and running"

---

### Step 6: Test Push Manually

**Open browser console and run:**
```javascript
// Trigger a test push notification
Notification.requestPermission().then(permission => {
  if (permission === "granted") {
    new Notification("Test Notification", {
      body: "If you see this, notifications work!",
      icon: "/icons/icon-192x192.png"
    });
  }
});
```

**If you see the notification:**
- Browser supports notifications ✅
- Permissions are granted ✅
- Issue is with push subscription or backend

**If you don't see it:**
- Check notification permission
- Check browser notification settings (OS level)
- Check "Focus Assist" or "Do Not Disturb" on Windows/Mac

---

## Common Issues & Solutions

### Issue 1: "Permission result: denied"

**Cause:** User clicked "Don't allow" on permission prompt

**Solution:**
1. Clear browser site settings:
   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Find localhost → Click reset
2. Hard refresh: `Ctrl+Shift+R` (Cmd+Shift+R on Mac)
3. Log out and back in
4. Enable notifications again

---

### Issue 2: "VAPID public key not found in environment"

**Cause:** Environment variable not set

**Solution:**
```bash
# Generate new VAPID keys
npx web-push generate-vapid-keys

# Add to .env.local:
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<key-from-above>
VAPID_PRIVATE_KEY=<private-key-from-above>
VAPID_SUBJECT=mailto:your-email@example.com

# Restart dev server:
npm run dev
```

---

### Issue 3: "Backend error: Invalid subscription data"

**Cause:** Subscription not saving to database

**Solution:**
1. Check `/api/notifications/subscribe` is reachable
2. Verify JWT token is valid (check cookies)
3. Check MongoDB connection in `.env.local`
4. Check server logs for database errors

---

### Issue 4: Service Worker Not Registered

**Cause:** Service worker file not found or failed to load

**Solution:**
1. Verify `/public/sw.js` exists
2. Check `/public/push-sw.js` exists
3. Hard refresh: `Ctrl+Shift+R`
4. Clear browser cache: Settings → Privacy → Clear browsing data
5. Restart dev server

---

## Testing Push Notifications

### Test Sequence:

1. **Log in as delivery staff**
   - Go to `/deliverystaff`
   - Should see "Enable Notifications" modal
   - Click "Enable"
   - Grant browser permission
   - Should see toast: "Notifications enabled successfully"

2. **Check console logs**
   - Open DevTools Console
   - Should see:
     ```
     Service Worker registered: ...
     Permission result: granted
     Service Worker ready: ...
     Successfully subscribed to push: ...
     Subscription saved successfully to backend
     ```

3. **Verify in database**
   - MongoDB: `db.pushSubscriptions.find({ userId: "YOUR_ID" })`
   - Should return subscription document

4. **Assign delivery as admin**
   - Log in as admin
   - Go to `/dashboard/shipments`
   - Find a pending shipment
   - Assign to the delivery staff member
   - **Staff should receive browser push notification** 🔔

5. **Check server logs**
   - Terminal should show:
     ```
     Sent notifications to 1/1 devices for user: [staffId]
     ```

---

## Expected Push Notification Messages

When delivery is assigned:
- **Title:** `Delivery: TRK-XXXXX`
- **Body:** `New delivery assigned to you`
- **Click action:** Opens `/deliverystaff` page

When status changes to "Out for Delivery":
- **Body:** `Package is out for delivery`

When "Delivered":
- **Body:** `Delivery completed`

When "Failed":
- **Body:** `Delivery attempt failed`

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | All features working |
| Edge | ✅ Full | All features working |
| Firefox | ✅ Full | All features working |
| Safari | ❌ No | Not supported (use Chrome/Edge) |
| Brave | ⚠️ Limited | May need Shields settings |

---

## If Still Not Working

**Gather diagnostic info:**

1. **Console logs** (copy all from DevTools console)
2. **Network tab** (screenshot of `/api/notifications/subscribe` request/response)
3. **Database query result** (from MongoDB)
4. **Browser version** (Chrome, Firefox, Edge, Safari)
5. **OS version** (Windows, Mac, Linux)

**Then check:**
1. Restart dev server: `npm run dev`
2. Hard refresh: `Ctrl+Shift+R`
3. Clear cache: Settings → Privacy → Clear browsing data
4. Check `.env.local` has all VAPID keys
5. Verify MongoDB connection works
6. Check `/public/sw.js` exists
7. Check `/public/push-sw.js` exists

---

## Key Files for Push Notifications

```
✅ app/components/PWASetup.tsx - Service worker registration & permission
✅ app/lib/notifications.ts - sendShipmentNotification() function
✅ public/sw.js - Generated by next-pwa
✅ public/push-sw.js - Push event handler
✅ app/lib/notificationDispatcher.ts - Calls sendShipmentNotification()
✅ .env.local - VAPID keys (MUST exist)
```

---

## Summary

**To enable push notifications:**

1. ✅ Ensure VAPID keys in `.env.local`
2. ✅ Staff grants browser permission
3. ✅ Subscription saved to database
4. ✅ Service worker receives push event
5. ✅ OS notification displayed to user

**If any step fails, the push won't show!**
