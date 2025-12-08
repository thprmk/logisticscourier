# Immediate Action Items - Netta Logistics

## 🔴 CRITICAL: Fix Build Error (Do First!)

### Issue
Build fails with Webpack/Babel error:
```
[BABEL] ...sw.js: You gave us a visitor for the node type StaticBlock 
but it's not a valid type
```

### Root Cause
Compatibility issue between `@ducanh2912/next-pwa` and current build tools

### Solution A: Update Package (Recommended)

1. **Update the PWA package:**
   ```powershell
   npm install --save-dev @ducanh2912/next-pwa@latest
   ```

2. **Clear cache:**
   ```powershell
   Remove-Item -Path ".next" -Recurse -Force
   Remove-Item -Path "node_modules" -Recurse -Force
   Remove-Item -Path "package-lock.json"
   npm install
   ```

3. **Verify fix:**
   ```powershell
   npm run build
   ```

### Solution B: If Update Doesn't Work

Update `next.config.ts`:

```typescript
// ... existing config ...

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev
  workboxOptions: {
    skipWaiting: true,
    // Remove problematic configuration if needed
  },
});

export default withPWA(nextConfig);
```

### Verification
After fix, should see:
```
✓ compiled successfully
✓ (pwa) Compiling for server...
✓ (pwa) Service worker compiled
```

---

## 🟠 HIGH: Standardize Role Naming

### Current Problem
Three different role systems coexist:

**Database (User.model.ts):**
```typescript
role: 'superAdmin' | 'admin' | 'staff'
```

**Login Response (api/auth/login/route.ts):**
```typescript
if (user.role === 'delivery_staff') {  // This role doesn't exist in DB!
  redirectTo = '/deliverystaff';
}
```

**Dashboard (DashboardLayout.tsx):**
```typescript
if (userData.role === 'staff') {  // Checking for 'staff'
  router.replace('/deliverystaff');
}
```

### Solution: Choose One Standard

**Option 1: Keep Current (Simplest)**
- Use: `'superAdmin' | 'admin' | 'staff'`
- Everywhere use `'staff'` NOT `'delivery_staff'`

**Option 2: Add Dispatcher Role (Recommended)**
- Use: `'superAdmin' | 'admin' | 'dispatcher' | 'staff'`
- Rename delivery staff route accordingly

### Implementation Steps

#### Step 1: Update User Model
File: `models/User.model.ts`

```typescript
role: {
  type: String,
  required: true,
  enum: ['superAdmin', 'admin', 'dispatcher', 'staff'],  // Add 'dispatcher'
},
```

#### Step 2: Update Login Route
File: `app/api/auth/login/route.ts` (around line 97)

```typescript
if (user.role === 'delivery_staff') {
  redirectTo = '/deliverystaff';
}
```

Change to:

```typescript
if (user.role === 'staff') {  // Change this line
  redirectTo = '/deliverystaff';
}
```

#### Step 3: Update Dashboard
File: `app/components/DashboardLayout.tsx` (around lines 64, 82, 90)

Already correct - uses `'staff'` ✅

#### Step 4: Verify Database
Run in MongoDB compass or terminal:

```javascript
// Check existing users
db.users.find().select({ role: 1, name: 1 })

// If you have 'delivery_staff' roles, update them:
db.users.updateMany(
  { role: 'delivery_staff' },
  { $set: { role: 'staff' } }
)
```

#### Step 5: Test All Flows
- [ ] Login as admin → should go to /dashboard
- [ ] Login as staff → should go to /deliverystaff
- [ ] Login as superAdmin → should go to /superadmin/dashboard

---

## 🟡 MEDIUM: Implement Lexend Font

### Current Problem
Design requires Lexend 400 font, but app uses system fonts

### Solution: Add Google Fonts

#### Step 1: Update Root Layout
File: `app/layout.tsx`

Replace this section:
```typescript
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext";

import type { Metadata } from "next";

export const metadata: Metadata = {
  // ...
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* ... */}
    </html>
  );
}
```

With this:
```typescript
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext";
import { Lexend } from 'next/font/google';

import type { Metadata } from "next";

// Configure Lexend font
const lexend = Lexend({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lexend',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Netta Logistics",
  description: "Courier and logistics management application",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Netta" />
      </head>
      <body>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

#### Step 2: Update CSS
File: `app/globals.css`

Update the body font-family rule (around line 22-28):

```css
body {
  @apply bg-gray-50;
  font-family: var(--font-lexend), system-ui, -apple-system, sans-serif;
  /* ... rest of styles ... */
}
```

#### Step 3: Verify in Browser
- Open DevTools (F12)
- Inspect any text element
- Look at computed font-family
- Should show "Lexend" as the primary font

### Fallback Chain
```
Lexend 400 → System fonts → Sans-serif
```

---

## 📋 Quick Verification Checklist

After applying fixes, verify each one:

### Build Fix
```powershell
npm run build
# Expected: Successfully compiled
```
- [ ] Build completes without errors
- [ ] Service worker compiles
- [ ] No Babel errors

### Role Standardization
```powershell
# Manual testing
# 1. Create test users with each role
# 2. Login and verify correct dashboard
# 3. Check notification routing
```
- [ ] Staff routes to /deliverystaff
- [ ] Admin routes to /dashboard
- [ ] SuperAdmin routes to /superadmin/dashboard
- [ ] Notifications work for each role

### Font Implementation
```powershell
# DevTools inspection
# Inspect any text element → Computed Styles → font-family
```
- [ ] Lexend font loads
- [ ] No FOUT (Flash of Unstyled Text)
- [ ] Consistent across all pages

---

## 🧪 Testing Command

After all fixes:

```powershell
# 1. Clean install
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
npm ci  # Use ci instead of install for exact versions

# 2. Build
npm run build

# 3. Start dev server
npm run dev

# 4. Test in browser
# Open http://localhost:3000
# Verify:
# - Load completes
# - Login works
# - Each role routes correctly
# - Font is Lexend
```

---

## 📝 Fix Summary Table

| Fix | Priority | Time | Status | Blocker |
|-----|----------|------|--------|---------|
| Update next-pwa | 🔴 CRITICAL | 15 min | ❌ | YES - Build fails |
| Clear cache & rebuild | 🔴 CRITICAL | 10 min | ❌ | YES - Build fails |
| Standardize roles | 🟠 HIGH | 30 min | ⏳ | NO - Runtime risk |
| Implement Lexend | 🟡 MEDIUM | 15 min | ⏳ | NO - Design only |

**Total Time to Fix All: ~1 hour**

---

## 🚨 Emergency Rollback

If something breaks:

```powershell
# Revert to previous working state
git status
git log --oneline -5

# If you have git history
git checkout HEAD~1

# Otherwise, restore from backup
# Restore package.json and reinstall
npm install
npm run build
```

---

## 📞 Support References

### Build Issues
- Next.js PWA: https://github.com/ducanh2912/next-pwa
- Check GitHub issues for similar errors
- Consider using custom service worker if package issues persist

### Role Management
- See: NOTIFICATION_EVENTS_MATRIX.txt (role breakdown)
- Check: app/api/auth/login/route.ts (login logic)
- Review: DashboardLayout.tsx (role routing)

### Font Implementation
- Next.js Fonts: https://nextjs.org/docs/app/building-application/optimizing/fonts
- Google Fonts: https://fonts.google.com/specimen/Lexend

### Testing Notifications
- See: QUICK_NOTIFICATION_TEST.md (manual test guide)
- Endpoint: /api/test/create-test-notification

---

## ✅ Completion Checklist

- [ ] Next-pwa updated to latest
- [ ] Build passes with `npm run build`
- [ ] Role enum standardized across codebase
- [ ] Lexend font imported in layout.tsx
- [ ] Font appears in browser DevTools
- [ ] All three user types (admin, staff, superAdmin) tested
- [ ] Notifications work for each role
- [ ] No console errors in DevTools

**Once all items are checked: ✅ READY FOR DEPLOYMENT**

---

**Timeline:** These fixes can all be done in **under 1 hour**  
**Risk Level:** Low (mostly updates and config changes)  
**Testing Required:** 30 minutes manual testing after fixes
