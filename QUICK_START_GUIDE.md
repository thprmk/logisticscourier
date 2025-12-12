# 🚀 QUICK START GUIDE - LOGISTICS COURIER APP

## ⚡ 5-Minute Setup

### 1. **Check Prerequisites**
```bash
node --version  # Should be v18+ (you have v23.3.0 ✅)
npm --version   # Should be v8+ (you have v10.9.0 ✅)
```

### 2. **Install Dependencies**
```bash
npm install
```

### 3. **Configure Environment**
File: `.env.local` - Already configured ✅
- MongoDB URI ✅
- JWT Secret ✅
- VAPID keys ✅

### 4. **Start Development Server**
```bash
npm run dev
```
- Opens on `http://localhost:3000`
- Auto-reload enabled ✅

### 5. **Login with Demo Credentials**
```
Email: superadmin@logistics.com
Password: superpassword123
```

---

## 📱 USER ROLES & ACCESS

### **Super Admin**
- Manage all branches (tenants)
- View system-wide analytics
- Manage tenant admins
- Access: `/superadmin/dashboard`

### **Branch Admin**
- Manage shipments & manifests
- Create & assign deliveries
- View branch analytics
- User management for branch
- Access: `/dashboard`

### **Delivery Staff**
- View assigned shipments
- Update delivery status
- Upload proof (signature/photo)
- Access: `/deliverystaff`

---

## 🎯 KEY FEATURES AT A GLANCE

### **Shipment Management**
```
1. Create shipment (auto-generates tracking ID)
2. Assign to staff
3. Track status through workflow
4. Upload delivery proof
5. View status history
```

### **Manifest (Dispatch)**
```
1. Select shipments at origin branch
2. Create manifest
3. System auto-notifies destination branch
4. Destination marks as received
5. View inter-branch metrics
```

### **Notifications**
```
- Real-time push notifications
- In-app notification bell
- Mark as read
- Event-driven (shipment created, delivered, failed, etc.)
```

### **Dashboard KPIs**
```
- Total shipments created
- Delivered count
- Failed deliveries
- Success rate percentage
- Ready for assignment count
- Incoming/outgoing manifests
```

---

## 🔌 API QUICK REFERENCE

### **Authentication**
```bash
# Login
POST /api/auth/login
{ "email": "admin@branch.com", "password": "pass123" }

# Get current user
GET /api/auth/me

# Logout
POST /api/auth/logout
```

### **Shipments**
```bash
# Get all shipments
GET /api/shipments

# Create shipment
POST /api/shipments
{
  "sender": { "name": "...", "address": "...", "phone": "..." },
  "recipient": { "name": "...", "address": "...", "phone": "..." },
  "packageInfo": { "weight": 5, "type": "Parcel", "details": "..." },
  "originBranchId": "...",
  "destinationBranchId": "..."
}

# Update shipment
PATCH /api/shipments/[shipmentId]
{ "status": "Out for Delivery", "notes": "..." }
```

### **Manifests**
```bash
# Get manifests (with filters)
GET /api/manifests?type=incoming&status=In%20Transit

# Create manifest
POST /api/manifests
{
  "toBranchId": "...",
  "shipmentIds": ["...", "..."],
  "vehicleNumber": "ABC-123",
  "driverName": "John Doe"
}
```

### **Notifications**
```bash
# Get user notifications
GET /api/notifications

# Mark as read
PATCH /api/notifications
{ "notificationId": "..." }

# Subscribe to push
POST /api/notifications/subscribe
{ "subscription": { "endpoint": "...", "keys": {...} } }
```

---

## 🗂️ PROJECT STRUCTURE QUICK MAP

```
app/
├── api/                    → All backend routes
│   ├── auth/              → Login, logout, me
│   ├── shipments/         → Shipment CRUD
│   ├── manifests/         → Manifest operations
│   ├── notifications/     → Notification APIs
│   └── users/            → User management
├── dashboard/             → Admin pages
├── deliverystaff/         → Mobile staff interface
├── superadmin/            → Super admin pages
└── components/            → Reusable React components

models/                     → MongoDB schemas (6 models)
lib/                        → Utilities (sanitize, rateLimiter, etc.)
public/                     → Static files & service worker
```

---

## 🔐 SECURITY FEATURES

- ✅ Input sanitization (XSS prevention)
- ✅ Rate limiting (10/min login, 30/min other)
- ✅ JWT authentication
- ✅ Password hashing (bcryptjs)
- ✅ CORS/CSRF protection ready
- ✅ Error boundary for crashes
- ✅ Secure cookie handling

---

## 📊 DATABASE (MongoDB)

**Models** (6 total):
1. **User** - Users with roles
2. **Shipment** - Package tracking
3. **Manifest** - Batch dispatch
4. **Tenant** - Branches/organizations
5. **Notification** - In-app alerts
6. **PushSubscription** - Web push subs

**Connection**: Mongoose with caching  
**Status**: ✅ Configured & ready

---

## 🧪 TESTING THE APP

### **Test Notification Creation**
```bash
POST /api/test/create-test-notification
# Creates a test notification for current user
```

### **Test Database Connection**
```javascript
// In browser console while logged in
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log)
```

### **Test Push Notifications**
1. Click notification bell 🔔
2. Allow permissions
3. Create/update a shipment
4. Should see push notification

---

## 🛠️ COMMON COMMANDS

```bash
# Development
npm run dev              # Start dev server

# Build
npm run build            # Production build
npm run start            # Run production build

# Database
npm run db:seed          # Create demo super admin

# Linting
npm run lint             # Run ESLint
```

---

## 🔍 DEBUGGING TIPS

### **Enable Console Logs**
All API routes log to server console. Watch terminal for:
- `Login successful for: ...`
- `Error dispatching notification...`
- `JWT verification failed`

### **Check Token in Browser**
```javascript
// In browser console
document.cookie  // See all cookies including 'token'
```

### **Test API Directly**
```bash
# Using curl
curl -X GET http://localhost:3000/api/auth/me \
  -H "Cookie: token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### **Check Service Worker**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => console.log(r)))
```

---

## 🌐 DEPLOYMENT CHECKLIST

- [ ] Run `npm run build` (no errors)
- [ ] Set production environment variables
- [ ] Verify MongoDB connection
- [ ] Verify VAPID keys for push
- [ ] Verify Vercel Blob token
- [ ] Run `npm run db:seed` (create admin)
- [ ] Test login flow
- [ ] Test shipment creation
- [ ] Test manifest dispatch
- [ ] Test push notifications
- [ ] Test offline functionality

---

## 📞 SUPPORT

For issues:
1. Check console logs (`npm run dev`)
2. Review `/PROJECT_FULL_AUDIT_REPORT.md`
3. Check specific audit files (40+ documentation files)
4. Review API_MANIFEST_REFERENCE.ts for endpoint details

---

## 🎓 LEARNING PATH

**New to the app?** Follow this order:
1. Read this file (QUICK_START_GUIDE.md)
2. Login to dashboard
3. Create a shipment
4. Create a manifest
5. View notifications
6. Read PROJECT_FULL_AUDIT_REPORT.md
7. Explore specific guides as needed

---

## ✅ CHECKLIST: What's Working

- [x] Authentication (login/logout/me)
- [x] Role-based access control
- [x] Shipment CRUD
- [x] Manifest creation & dispatch
- [x] Status tracking
- [x] Notifications (DB + Push)
- [x] User management
- [x] Dashboard with KPIs
- [x] Responsive UI
- [x] Security (sanitization + rate limiting)
- [x] PWA features
- [x] Error handling

---

**Ready to go!** 🚀

```bash
npm run dev
# Then visit http://localhost:3000
```
