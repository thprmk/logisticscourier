# 📊 Shipment Overview Chart - Date Range Verification

## ✅ Date Range Calculations

### 1. **Week** (Last 7 Days)
- **Calculation**: Today - 6 days = 7 days total (including today)
- **Example**: If today is Dec 22, 2025
  - Start: Dec 16, 2025 (today - 6 days)
  - End: Dec 23, 2025 (tomorrow)
- **Status**: ✅ FIXED (was using 30 days, now uses 7 days)

### 2. **Month** (Current Month)
- **Calculation**: First day of current month to first day of next month
- **Example**: If today is Dec 22, 2025
  - Start: Dec 1, 2025
  - End: Jan 1, 2026
- **Status**: ✅ CORRECT

### 3. **Last 3 Months**
- **Calculation**: First day of month 3 months ago to today
- **Example**: If today is Dec 22, 2025
  - Start: Sep 1, 2025 (3 months ago, first day)
  - End: Dec 23, 2025 (tomorrow)
- **Status**: ✅ CORRECT

### 4. **Year** (Current Year)
- **Calculation**: January 1 of current year to January 1 of next year
- **Example**: If today is Dec 22, 2025
  - Start: Jan 1, 2025
  - End: Jan 1, 2026
- **Status**: ✅ CORRECT

## 🔍 API Query Verification

The API endpoint `/api/shipments` uses:
```typescript
query.createdAt = {
  $gte: fromDate,  // Greater than or equal to start
  $lt: toDate      // Less than end (exclusive)
}
```

This means:
- Start date is **inclusive** (includes shipments created on that day)
- End date is **exclusive** (doesn't include shipments created on that day)

## ✅ Verification Results

| Range | Start Date | End Date | Status |
|-------|-----------|----------|--------|
| Week | Today - 6 days | Tomorrow | ✅ Fixed |
| Month | 1st of month | 1st of next month | ✅ Correct |
| Last 3 Months | 1st of month 3 months ago | Tomorrow | ✅ Correct |
| Year | Jan 1 | Jan 1 next year | ✅ Correct |

## 🧪 Testing Checklist

- [ ] Select "This Week" - should show last 7 days
- [ ] Select "This Month" - should show current month
- [ ] Select "Last 3 Months" - should show last 3 months
- [ ] Select "This Year" - should show current year
- [ ] Verify chart updates when changing dropdown
- [ ] Verify API receives correct date range
- [ ] Verify chart displays data correctly

## 📝 Notes

- All date ranges use `tomorrow` as end date to ensure today's data is included
- Date calculations use local time (setHours(0,0,0,0))
- API uses MongoDB date comparison ($gte and $lt)

