# Tenant Data Separation & Concurrent Users Performance Audit

## 🔍 Executive Summary

This audit examines tenant data isolation and concurrent user performance. Overall, the application has **good tenant separation** but has **critical issues** that need immediate attention.

---

## ✅ **TENANT DATA SEPARATION - STRENGTHS**

### 1. **Model-Level Tenant Isolation**
- ✅ **Shipment**: `tenantId` indexed, required, properly referenced
- ✅ **Notification**: `tenantId` indexed, required
- ✅ **Manifest**: Uses `fromBranchId` and `toBranchId` (both indexed)
- ✅ **User**: Has `tenantId` field (but **NOT indexed** - see issues)

### 2. **API Route Tenant Filtering**
Most API routes properly filter by `tenantId`:
- ✅ `/api/shipments` - Filters by `tenantId: payload.tenantId`
- ✅ `/api/shipments/[shipmentId]` - Checks `tenantId` in GET and PATCH
- ✅ `/api/users` - Filters by `tenantId: payload.tenantId`
- ✅ `/api/manifests` - Filters by `fromBranchId`/`toBranchId` based on user's `tenantId`
- ✅ `/api/manifests/[manifestId]/receive` - Validates destination branch matches user's `tenantId`

### 3. **Authorization Checks**
- ✅ All routes check for `payload.tenantId` before querying
- ✅ Shipment updates verify branch permissions (origin/current branch)
- ✅ Role-based access control (admin/staff) properly enforced

---

## 🚨 **CRITICAL ISSUES FOUND**

### **Issue #1: Notifications API Missing Tenant Filter** ⚠️ **CRITICAL**
**Location**: `app/api/notifications/route.ts`

**Problem**: The notifications API only filters by `userId`, not `tenantId`. This could allow cross-tenant data leakage if a user ID is somehow compromised or reused.

**Current Code**:
```typescript
const notifications = await Notification.find({ userId: userIdString })
```

**Risk**: 
- If user IDs are predictable or reused, users could access other tenants' notifications
- No tenant-level isolation for notifications

**Fix Required**: Add `tenantId` filter from JWT payload

---

### **Issue #2: User Model Missing tenantId Index** ⚠️ **PERFORMANCE**
**Location**: `models/User.model.ts`

**Problem**: The `tenantId` field in the User model is not indexed, causing slow queries when filtering users by tenant.

**Current Code**:
```typescript
tenantId: {
  type: Schema.Types.ObjectId,
  ref: 'Tenant',
  // ❌ Missing: index: true
}
```

**Impact**: 
- Slow queries when fetching users by tenant (common operation)
- Degraded performance with many concurrent users
- Database full collection scans

**Fix Required**: Add `index: true` to `tenantId` field

---

### **Issue #3: Database Connection Pooling Not Configured** ⚠️ **PERFORMANCE**
**Location**: `lib/dbConnect.ts`

**Problem**: MongoDB connection doesn't specify pool size limits, which can cause connection exhaustion under high concurrent load.

**Current Code**:
```typescript
const opts = {
  bufferCommands: false,
  // ❌ Missing: maxPoolSize, minPoolSize, etc.
};
```

**Impact**:
- Default pool size (10 connections) may be insufficient for high concurrency
- No control over connection lifecycle
- Potential connection exhaustion under load

**Recommended Fix**: Add explicit pool configuration

---

### **Issue #4: No Compound Indexes for Common Queries** ⚠️ **PERFORMANCE**
**Problem**: Missing compound indexes for frequently used query patterns.

**Examples**:
- `{ tenantId, status }` - Common filter combination
- `{ tenantId, createdAt }` - For date-sorted queries
- `{ tenantId, assignedTo }` - For staff assignment queries

**Impact**: Slower queries as data grows, especially with concurrent users

---

## 📊 **PERFORMANCE ANALYSIS FOR CONCURRENT USERS**

### **Current Optimizations** ✅
1. **Connection Caching**: Global mongoose connection cache prevents connection leaks
2. **Indexes**: Most critical fields are indexed (`tenantId`, `trackingId`, etc.)
3. **Pagination**: API routes use pagination (20-50 items per page)
4. **Debounced Search**: Client-side search debounced (300ms)
5. **Lean Queries**: Some queries use `.lean()` for faster results

### **Performance Bottlenecks** ⚠️
1. **Missing User tenantId Index**: User queries by tenant will be slow
2. **No Connection Pool Limits**: Risk of connection exhaustion
3. **Missing Compound Indexes**: Complex queries will slow down
4. **No Query Result Caching**: Repeated queries hit database every time
5. **No Database Query Timeout**: Long-running queries could block connections

---

## 🔧 **RECOMMENDED FIXES**

### **Priority 1: Critical Security & Data Isolation**

#### Fix #1: Add Tenant Filter to Notifications API
```typescript
// app/api/notifications/route.ts
const payload = await getUserPayload(request);
if (!payload || !payload.tenantId) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

const notifications = await Notification.find({ 
  userId: userIdString,
  tenantId: payload.tenantId  // ✅ Add this
})
```

#### Fix #2: Add tenantId Index to User Model
```typescript
// models/User.model.ts
tenantId: {
  type: Schema.Types.ObjectId,
  ref: 'Tenant',
  index: true,  // ✅ Add this
}
```

### **Priority 2: Performance Optimizations**

#### Fix #3: Configure Database Connection Pool
```typescript
// lib/dbConnect.ts
const opts = {
  bufferCommands: false,
  maxPoolSize: 50,        // Maximum connections in pool
  minPoolSize: 5,         // Minimum connections to maintain
  maxIdleTimeMS: 30000,    // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000,  // Timeout for server selection
};
```

#### Fix #4: Add Compound Indexes
```typescript
// In Shipment model
ShipmentSchema.index({ tenantId: 1, status: 1 });
ShipmentSchema.index({ tenantId: 1, createdAt: -1 });
ShipmentSchema.index({ tenantId: 1, assignedTo: 1 });

// In Notification model
NotificationSchema.index({ tenantId: 1, userId: 1, read: 1, createdAt: -1 });
```

---

## 📈 **CONCURRENT USER CAPACITY ESTIMATE**

### **Current Configuration** (Before Fixes)
- **Estimated Capacity**: ~50-100 concurrent users
- **Bottleneck**: Connection pool (default 10 connections)
- **Risk**: Connection exhaustion, slow queries

### **After Recommended Fixes**
- **Estimated Capacity**: ~200-500 concurrent users
- **Improvements**: 
  - Larger connection pool (50 connections)
  - Faster queries (indexes)
  - Better tenant isolation

### **For Higher Scale (500+ users)**
Additional recommendations:
1. **Redis Caching**: Cache frequently accessed data
2. **Database Replication**: Read replicas for scaling reads
3. **CDN**: Static asset delivery
4. **Load Balancing**: Multiple server instances
5. **Query Optimization**: Review and optimize slow queries

---

## ✅ **VERIFICATION CHECKLIST**

### **Tenant Data Separation**
- [x] Shipment queries filter by `tenantId`
- [x] User queries filter by `tenantId`
- [x] Manifest queries filter by branch IDs
- [ ] **Notifications queries filter by `tenantId`** ⚠️ **NEEDS FIX**
- [x] All API routes check `payload.tenantId`
- [x] Authorization checks prevent cross-tenant access

### **Performance**
- [x] Connection caching implemented
- [x] Critical fields indexed
- [ ] **User `tenantId` indexed** ⚠️ **NEEDS FIX**
- [ ] **Connection pool configured** ⚠️ **NEEDS FIX**
- [ ] Compound indexes for common queries ⚠️ **RECOMMENDED**
- [x] Pagination implemented
- [x] Debounced search

---

## 🎯 **ACTION ITEMS**

### **Immediate (Critical)**
1. ✅ Fix notifications API to filter by `tenantId`
2. ✅ Add `index: true` to User model's `tenantId` field
3. ✅ Configure database connection pool settings

### **Short-term (High Priority)**
4. Add compound indexes for common query patterns
5. Add query timeouts to prevent long-running queries
6. Monitor database query performance

### **Long-term (Optimization)**
7. Implement Redis caching for frequently accessed data
8. Add database query logging and monitoring
9. Consider read replicas for scaling

---

## 📝 **SUMMARY**

### **Strengths**
- ✅ Good tenant isolation at API level
- ✅ Proper authorization checks
- ✅ Most critical fields indexed
- ✅ Connection caching prevents leaks

### **Critical Issues**
- 🚨 Notifications API missing tenant filter (security risk)
- 🚨 User model missing tenantId index (performance)
- 🚨 No connection pool configuration (scalability)

### **Overall Assessment**
**Tenant Data Separation**: 8/10 (Good, but needs notification fix)
**Concurrent User Performance**: 6/10 (Adequate, but needs optimization)

**Recommendation**: Apply Priority 1 fixes immediately, then implement Priority 2 optimizations for better scalability.


