# Quick Notification Testing Guide

## Option A: Test Endpoint (Fastest)

### 1. Log In as Delivery Staff
- Go to `/deliverystaff`
- Enter your staff credentials

### 2. Create a Test Notification
Open **DevTools Console** and run:

```javascript
fetch('/api/test/create-test-notification', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Created:', data))
```

**Expected Output:**
```
Created: {
  message: "Test notification created successfully",
  notification: {
    _id: "...",
    message: "[TEST] Test notification created at...",
    type: "delivery_assigned",
    trackingId: "TEST-1234567890",
    read: false
  }
}
```

### 3. Watch Console & UI

**Console logs should show:**
```
[Notifications] Fetching for user: YOUR_USER_ID
[Notifications] Received: 1 notifications
[Notifications] Unread count: 1
```

**UI should show:**
- 🔴 Red badge on bell icon with number "1"
- Click bell → Dropdown shows notification with "[TEST]" message

---

## Option B: Real Workflow Test

### Setup (Two Browser Windows)

**Window A:** Admin/Dispatcher account
**Window B:** Staff account

### Test Steps:

1. **Window B:** Log in as Staff → Enable notifications
2. **Window A:** Log in as Admin
3. **Window A:** Create a shipment via `/dashboard/shipments`
4. **Window A:** Find the shipment and assign to the Staff user
5. **Window B:** Watch for notification:
   - Check bell icon → should show red badge
   - Check browser console → should show `[Notifications] Received: X notifications`
   - Click bell → should see "New delivery assigned to you" message

### Expected Timeline:
- Assignment sent: Notification should appear within **10 seconds** max
- If not appearing: Check console logs for `[Notifications]` entries

---

## Debugging Flow

If notifications don't appear:

### Step 1: Console Check
```javascript
// Copy-paste in DevTools console:
fetch('/api/notifications', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Total notifications:', data.length, data))
```

**If returns 0:** Notification wasn't created in database
**If returns notifications:** Issue is with UI rendering

### Step 2: Database Check
If you have database access:

```javascript
// MongoDB query
db.notifications.findOne({ 
  userId: YOUR_STAFF_USER_ID 
}, { sort: { createdAt: -1 } })
```

Should show notification with `type: "delivery_assigned"`

### Step 3: API Endpoint Check
```javascript
// Check if endpoint exists and is callable:
fetch('/api/test/create-test-notification', {
  method: 'POST',
  credentials: 'include'
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(d => console.log('Response:', d))
```

---

## What Changed vs. Before

| Aspect | Before | After |
|--------|--------|-------|
| **Polling Interval** | 30 seconds | 10 seconds |
| **Console Logging** | Minimal | Detailed with `[Notifications]` prefix |
| **API Response Details** | Just count | Shows sample notifications |
| **Test Endpoint** | None | `/api/test/create-test-notification` |
| **Error Visibility** | Silent failures | Logged to console |

---

## Key Console Outputs to Watch

### ✅ When Working Correctly:

```
[Notifications] Fetching for user: 507f1f77bcf86cd799439011
[Notifications] Received: 3 notifications
[Notifications] Unread count: 1
Found 3 notifications for user 507f1f77bcf86cd799439011
Latest notifications: [
  {
    id: "507f1f77bcf86cd799439012",
    message: "New delivery assigned to you - TRACK123",
    type: "delivery_assigned",
    createdAt: "2025-11-30T10:30:00.000Z",
    read: false
  },
  ...
]
```

### ❌ When Something is Wrong:

**No `[Notifications]` logs at all:**
- Layout component not fetching
- User might not be logged in as staff
- Browser DevTools might not be showing JavaScript console

**Received: 0 notifications:**
- No notifications in database for this user
- Notifications aren't being created when assignments happen
- Check `notificationDispatcher.ts` is being called

**API returns 401:**
- JWT token expired or missing
- Try logging out and back in
- Check cookie is being sent with request

---

## Next Steps

1. **Run test endpoint** (Option A above)
2. **Watch console logs** - you should see `[Notifications]` entries
3. **Check bell icon** - red badge should appear immediately
4. **If working:** Issue is solved! 🎉
5. **If not working:** Share console output so I can debug further

---

## Remember

- Notifications update every **10 seconds** (changed from 30)
- All new notifications start with `read: false`
- Test endpoint creates notifications with `[TEST]` prefix for easy identification
- All fetch requests are logged to console for debugging

**The diagnostic guide is in `NOTIFICATION_NOT_SHOWING_DIAGNOSIS.md` for deeper troubleshooting.**
