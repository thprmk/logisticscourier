# Notification UI Standardization Guide

## Overview

A standardized notification design system with 4 visual types to make notifications instantly scannable and reduce cognitive load.

---

## 🎯 Visual Design System

### 4 Notification Types

#### 1. **Success** (Green) ✅
- **Icon:** CheckCircle2
- **Color:** text-green-600, bg-green-50, border-green-200
- **Use for:** Delivered, Completed
- **Example:** "Delivery completed to Rajesh"

#### 2. **Warning** (Amber) ⚠️
- **Icon:** Truck, Route, or Clock
- **Color:** text-amber-600, bg-amber-50, border-amber-200
- **Use for:** In-progress statuses (Assigned, Out for Delivery, Manifest Dispatched/Arrived)
- **Example:** "Out for delivery - TRK-XYZ123"

#### 3. **Error** (Red) ❌
- **Icon:** XCircle
- **Color:** text-red-600, bg-red-50, border-red-200
- **Use for:** Failed deliveries
- **Example:** "Delivery failed - Customer not available"

#### 4. **Info** (Slate/Blue) ℹ️
- **Icon:** Package, Info, or FileText
- **Color:** text-slate-600, bg-slate-50, border-slate-200
- **Use for:** System events (Created, Manifest Arrived)
- **Example:** "New shipment created - TRK-ABC456"

---

## 📦 Notification Item Layout

```
┌─────────────────────────────────────────────────────────┐
│ [colored icon] Delivery Assigned   [Assigned badge] 🔵  │
│ circle                                          (unread) │
│                                                          │
│ New delivery assigned to you - TRK-ABCD1234             │
│ 2m ago                                                   │
│                                                          │
│                                          [👁] [🗑]       │
│                                        (on hover)        │
└─────────────────────────────────────────────────────────┘
```

### Components:

1. **Icon Circle** - Small colored background with icon
   - 10x10 px circle, centered icon
   - Same color as accent color scheme
   - Always visible

2. **Title** - Bold if unread
   - 12px, font-semibold
   - Becomes font-bold if unread

3. **Status Pill** - Colored badge
   - Small rounded pill next to title
   - Text color matches accent
   - Background matches type color

4. **Message** - Main notification text
   - 12px, gray-600
   - Max 2 lines (line-clamp-2)
   - Extracts tracking ID for quick scanning

5. **Timestamp** - Relative time
   - "Just now", "5m ago", "Yesterday", "Dec 12"
   - 10px, gray-400

6. **Unread Indicator** - Blue dot
   - Top-right corner
   - 2x2 px blue dot
   - Only shows if `read: false`

7. **Action Buttons** - Show on hover
   - **View** - Eye icon, opens relevant page
   - **Ignore** - Trash icon, marks as read

---

## 🗺️ Event-to-Visual Mapping

| Database Type | Visual Type | Icon | Pill | Title | Example |
|---|---|---|---|---|---|
| `delivery_assigned` | warning | Truck | Assigned | Delivery Assigned | "New delivery assigned to you" |
| `out_for_delivery` | warning | Truck | Out for Delivery | Out for Delivery | "Your delivery is out for delivery" |
| `delivered` | success | CheckCircle2 | Delivered | Delivery Completed | "Delivery completed successfully" |
| `delivery_failed` | error | XCircle | Failed | Delivery Failed | "Delivery attempt failed" |
| `shipment_created` | info | Package | New Shipment | Shipment Created | "New shipment created" |
| `manifest_created` | info | Package | New Manifest | Manifest Created | "New manifest created" |
| `manifest_dispatched` | warning | Route | Manifest Dispatched | Manifest Dispatched | "Manifest dispatching to..." |
| `manifest_arrived` | info | Package | Manifest Arrived | Manifest Arrived | "Manifest arrived at branch" |

---

## 🎨 Color Palette

```css
/* Success - Green */
text-green-600
bg-green-50
border-green-200

/* Warning - Amber */
text-amber-600
bg-amber-50
border-amber-200

/* Error - Red */
text-red-600
bg-red-50
border-red-200

/* Info - Slate */
text-slate-600
bg-slate-50
border-slate-200
```

---

## 📋 Action Behaviors

### Per-Notification Actions

**View Button** (Eye Icon)
- Opens the relevant page for that notification
- For deliveries: Opens `/deliverystaff?shipmentId=...`
- For manifests: Opens manifest details
- Primary action (user likely wants to see details)

**Ignore Button** (Trash Icon)
- Marks notification as read (without deletion)
- Changes appearance: removes bold, removes blue dot
- Notification stays in history
- Can be cleared later with "Clear All"

### Global Actions (Top-right of list)

**Clear All** Button
- Removes all READ notifications from view
- Does NOT affect unread notifications
- Optional action (can be hidden initially)
- Use: When user has too many old notifications

**Mark All as Read** Button  
- Marks all unread as read in one click
- Changes appearance of all: removes bold, removes dots
- Optional feature (can be added later)

---

## 📂 Grouping Strategy (Future Enhancement)

Group notifications by sections for mental organization:

```
┌─────────────────────┐
│ 🔴 Unread (3)       │
├─────────────────────┤
│ [Assigned]          │
│ [Out for Delivery]  │
│ [Failed]            │
├─────────────────────┤
│ 📅 Today            │
├─────────────────────┤
│ [Delivered]         │
│ [Delivered]         │
├─────────────────────┤
│ 📅 Earlier          │
├─────────────────────┤
│ [Delivered]         │
│ [Manifest Arrived]  │
└─────────────────────┘
```

Grouping reduces cognitive load by:
- Prioritizing unread notifications
- Separating timeline: Today vs Earlier
- Making it easy to find relevant notifications quickly

---

## 🛠️ Implementation in Dropdown

### Current Usage (in deliverystaff/layout.tsx):

```tsx
import NotificationItem from '@/app/components/NotificationItem';
import { getNotificationPresentation, formatNotificationTime } from '@/app/lib/notificationPresentation';

// Inside notification dropdown:
{notificationList.map((notification: any) => {
  const presentation = getNotificationPresentation(notification.type);
  const formattedTime = formatNotificationTime(notification.createdAt);
  
  return (
    <NotificationItem
      key={notification._id}
      id={notification._id.toString()}
      type={presentation.type}
      title={presentation.title}
      message={notification.message}
      timestamp={formattedTime}
      read={notification.read}
      pill={presentation.pill}
      onView={() => {
        // Navigate to relevant page
        // Extract tracking ID from message
      }}
      onIgnore={() => {
        // Call PATCH /api/notifications to mark as read
      }}
    />
  );
})}
```

---

## 🔮 Visual Preview

### Assigned (Warning/Amber)
```
┌────────────────────────────────────────────┐
│ [🚚] Delivery Assigned    [Assigned] 🔵    │
│ New delivery assigned to you - TRK-ABC123  │
│ 2m ago                            [👁] [🗑] │
└────────────────────────────────────────────┘
```

### Out for Delivery (Warning/Amber)
```
┌────────────────────────────────────────────┐
│ [🚚] Out for Delivery    [Out for Delivery]│
│ Your delivery is out for delivery - TRK-XYZ│
│ Just now                          [👁] [🗑] │
└────────────────────────────────────────────┘
```

### Delivered (Success/Green)
```
┌────────────────────────────────────────────┐
│ [✓] Delivery Completed       [Delivered]   │
│ Delivery completed successfully - TRK-DEF  │
│ 1h ago                            [👁] [🗑] │
└────────────────────────────────────────────┘
```

### Failed (Error/Red)
```
┌────────────────────────────────────────────┐
│ [✕] Delivery Failed           [Failed] 🔵  │
│ Delivery attempt failed - Customer not home│
│ 30m ago                           [👁] [🗑] │
└────────────────────────────────────────────┘
```

### New Shipment (Info/Slate)
```
┌────────────────────────────────────────────┐
│ [📦] Shipment Created   [New Shipment]     │
│ New shipment created - TRK-GHI456          │
│ Yesterday                         [👁] [🗑] │
└────────────────────────────────────────────┘
```

---

## ✅ Benefits

1. **Instant Recognition** - Different colors/icons = instant understanding
2. **Less Noise** - Consistent design prevents alert fatigue
3. **Scannable** - Status pills and timestamps make scanning fast
4. **Actionable** - View/Ignore buttons are always available
5. **Unread Tracking** - Blue dot + bold text make unread obvious
6. **Extensible** - Easy to add new event types to the mapping

---

## 📝 Files

- `app/components/NotificationItem.tsx` - Reusable notification item component
- `app/lib/notificationPresentation.ts` - Type mapping and utility functions
- `app/deliverystaff/layout.tsx` - Integrate NotificationItem in dropdown
- `app/components/DashboardLayout.tsx` - Integrate in admin notification dropdown

---

## 🚀 Next Steps

1. Import `NotificationItem` in notification dropdowns
2. Use `getNotificationPresentation()` to map types
3. Use `formatNotificationTime()` for timestamps
4. Add click handlers for View and Ignore buttons
5. (Optional) Add grouping by Unread/Today/Earlier
6. (Optional) Add Clear All button
