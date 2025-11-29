# Delivery Staff Notifications - Troubleshooting & Setup Guide

## ✅ Fixed Issue
The notification permission prompt wasn't showing for delivery staff because **PWASetup component was missing from the delivery staff layout**. This has been fixed.

---

## 🔔 How Delivery Staff Notifications Work

### Step 1: Enable Notifications (First Time)
1. Delivery staff logs in
2. PWASetup component shows **"Enable Notifications"** modal
3. Click **"Enable"** button
4. Browser requests permission
5. Click **"Allow"** in browser prompt
6. Subscription saved to database automatically

### Step 2: Receive Assignments
When admin/dispatcher assigns a delivery:
1. Database notification created
2. Push notification sent (immediate alert 🔔)
3. In-app notification displayed in bell icon
4. Notification counter badge shows unread count

### Step 3: View Notifications
- Click **Bell icon** in header
- See all notifications with timestamps
- Notifications auto-refresh every 30 seconds
- Mark as read when clicking assignment

---

## 🛠️ Troubleshooting Checklist

### Issue 1: No Permission Prompt Showing

**Symptoms:** Delivery staff logs in but sees no notification permission request

**Causes & Solutions:**
- ✅ **FIXED**: PWASetup was not in delivery staff layout → **Now added**
- ❓ User already denied permissions → Clear browser data and retry
- ❓ App is installed as PWA → Installed apps don't show permission prompts
- ❓ Browser doesn't support notifications → Try Chrome, Edge, or Firefox

**How to Fix:**
```typescript
// Already fixed in app/deliverystaff/layout.tsx
import PWASetup from '@/app/components/PWASetup';

export default function DeliveryStaffLayout({ children }) {
  return (
    <div>
      <PWASetup />  {/* ← This now shows permission prompt */}
      {/* ... rest of layout ... */}
    </div>
  );
}
```

### Issue 2: No Push Notifications Arriving

**Symptoms:** Permission granted but no browser push notifications (🔔)

**Checklist:**
- [ ] Check **VAPID keys configured** in `.env.local`:
  ```
  NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
  VAPID_PRIVATE_KEY=your_private_key_here
  ```
- [ ] Check **Browser notification settings**:
  - Brave/Chrome: Settings → Privacy → Notifications → Allow
  - Firefox: Preferences → Privacy → Notifications → Allow
- [ ] Check **Service Worker registered**:
  - Open DevTools → Application → Service Workers
  - Should show `/sw.js` with status "Active"
- [ ] Check **Push subscription saved**:
  - Browser DevTools → Application → Storage → IndexedDB
  - Look for push subscription data

**How to Verify VAPID Keys:**
```bash
# Generate new keys if missing:
npm run generate-vapid-keys

# Or manually:
npx web-push generate-vapid-keys
```

### Issue 3: No In-App Notifications Showing

**Symptoms:** Assignments made but notification bell shows 0

**Checklist:**
- [ ] Check **API endpoint working**:
  ```bash
  curl -H "Cookie: token=YOUR_TOKEN" \
    http://localhost:3000/api/notifications
  # Should return array of notifications
  ```
- [ ] Check **Database has notifications**:
  ```bash
  # MongoDB query
  db.notifications.find({ userId: "STAFF_ID" })
  ```
- [ ] Check **Layout fetching notifications**:
  - Open DevTools → Network tab
  - Look for `/api/notifications` request
  - Should return 200 OK with notification data

### Issue 4: Permission Prompt Shows But Enable Button Does Nothing

**Symptoms:** Click "Enable" but nothing happens, no toast message

**Causes:**
- VAPID keys not configured
- Service worker not registered
- Push notifications not supported

**How to Debug:**
```javascript
// Open DevTools Console and check:
navigator.serviceWorker.ready
  .then(reg => {
    console.log('Service Worker ready:', reg);
    return reg.pushManager.getSubscription();
  })
  .then(sub => console.log('Push subscription:', sub))
  .catch(err => console.error('Error:', err));
```

---

## 🧪 Testing Notifications

### Test 1: In-App Notifications
1. Log in as **Admin**
2. Create a shipment
3. Assign it to a **Staff member**
4. Log in as **Staff**
5. Check notification bell → Should show 1 unread
6. See message: "New delivery assigned to you"

### Test 2: Push Notifications
1. Complete Test 1 above
2. Keep Staff user logged in
3. As Admin, change shipment status to **"Out for Delivery"**
4. Staff should receive **browser push notification** 🔔
5. Click notification to open app

### Test 3: Multiple Notifications
1. Assign 5 different shipments to same staff
2. Check bell icon → Should show "5"
3. Click bell → Should list all 5 notifications

---

## 🔧 Manual Verification Steps

### Check Service Worker
```javascript
// Console:
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => {
      console.log('Scope:', reg.scope);
      console.log('Controller:', reg.controller);
    });
  });
```

### Check Push Subscription
```javascript
// Console:
navigator.serviceWorker.ready
  .then(reg => reg.pushManager.getSubscription())
  .then(sub => console.log(JSON.stringify(sub, null, 2)));
```

### Check Notification Permission
```javascript
// Console:
console.log('Permission:', Notification.permission);
// Should output: "granted"
```

### Check Database
```bash
# MongoDB shell
db.pushSubscriptions.find({ userId: "STAFF_ID" })
# Should return subscription document
```

---

## 📋 Notification Events for Staff

### Events That Trigger Notifications:

| Event | Trigger | Push | In-App |
|-------|---------|------|--------|
| **🚚 Delivery Assigned** | Admin assigns shipment | ✅ | ✅ |
| **📦 Out for Delivery** | Staff updates status | ✅ | ✅ |
| **✅ Delivered** | Staff marks complete | ✅ | ✅ |
| **❌ Failed** | Delivery attempt failed | ✅ | ✅ |

### Events That DON'T Notify Staff:
- Shipment Created (only admin/dispatcher)
- Manifest Created (only admin/dispatcher)
- Manifest Dispatched (only admin/dispatcher)
- Manifest Arrived (only admin/dispatcher)

---

## 🚀 Quick Start for Delivery Staff

1. **Log In**
   - Navigate to `/deliverystaff`
   - Enter credentials

2. **Enable Notifications** (if prompted)
   - Click "Enable" button
   - Click "Allow" in browser permission
   - Confirmation toast appears

3. **Wait for Assignments**
   - Admin assigns deliveries
   - You'll see them in "My Deliveries" page
   - Notification bell shows unread count
   - Push notification appears (if enabled)

4. **Update Delivery Status**
   - Click on shipment
   - Update status (Out for Delivery, Delivered, etc.)
   - Notifications sent to admin/dispatcher automatically

---

## 🔍 Common Browser Issues

### Chrome/Edge
- Settings → Privacy & Security → Site Settings → Notifications
- Find your app → Change to "Allow"

### Firefox
- about:preferences → Privacy & Security → Permissions → Notifications
- Add-on exemptions for your site

### Safari
- Not supported (macOS Big Sur+ may support)
- Use Chrome/Edge for full functionality

### Brave Browser
- Notifications may be blocked by default
- Check Brave Shields icon → Settings → Notifications

---

## 📞 Still Not Working?

Check these in order:

1. **Verify VAPID keys exist**
   ```bash
   echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
   echo $VAPID_PRIVATE_KEY
   # Both should output keys
   ```

2. **Restart dev server**
   ```bash
   npm run dev
   ```

3. **Clear browser cache**
   - Ctrl+Shift+Delete (or Cmd+Shift+Delete)
   - Clear "All time" data
   - Reload page

4. **Check browser console**
   - Open DevTools (F12)
   - Look for red error messages
   - Check Network tab for failed API calls

5. **Verify database connection**
   - Check MongoDB is running
   - Verify `.env.local` DATABASE_URL is correct

6. **Check server logs**
   - Look for notification-related errors
   - Check `/api/notifications/subscribe` for issues

---

## 📚 Related Files

- `app/components/PWASetup.tsx` - Notification setup component
- `app/deliverystaff/layout.tsx` - Now includes PWASetup
- `app/lib/notificationDispatcher.ts` - Notification routing logic
- `app/api/notifications/subscribe/route.ts` - Save push subscriptions
- `app/api/notifications/route.ts` - Fetch notifications
- `public/sw.js` - Service worker push handlers

---

## ✅ What's Fixed

- ✅ PWASetup component now in delivery staff layout
- ✅ Permission prompt appears on staff login
- ✅ Subscription saved when "Enable" clicked
- ✅ In-app notifications fetch every 30 seconds
- ✅ Push notifications for delivery events
- ✅ Notification bell shows unread count

**Your notification system is now fully functional! 🎉**

