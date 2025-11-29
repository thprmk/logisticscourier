# Shadcn/ui Migration Examples

## Example 1: Converting Custom Button to Shadcn Button

### Before (Current Custom Button)
```typescript
<button 
  type="submit" 
  disabled={isSubmitting} 
  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSubmitting ? (
    <span className="flex items-center">
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" ...>
      </svg>
      Saving...
    </span>
  ) : 'Save Changes'}
</button>
```

### After (Shadcn Button)
```typescript
import { Button } from "@/components/ui/button"

<Button 
  type="submit" 
  disabled={isSubmitting} 
  className="w-full sm:w-auto"
>
  {isSubmitting ? (
    <span className="flex items-center">
      <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
      Saving...
    </span>
  ) : 'Save Changes'}
</Button>
```

---

## Example 2: Converting Custom Dropdown to Shadcn Select

### Before (Current Custom Dropdown)
```typescript
<select 
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="h-10 sm:h-12 w-full sm:w-48 pl-3 sm:pl-4 pr-8 sm:pr-10 text-sm sm:text-base bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
>
  <option value="">All Statuses</option>
  <option value="At Origin Branch">At Origin Branch</option>
  <option value="In Transit to Destination">In Transit</option>
  <option value="At Destination Branch">At Destination Branch</option>
  <option value="Assigned">Assigned</option>
  <option value="Out for Delivery">Out for Delivery</option>
  <option value="Delivered">Delivered</option>
  <option value="Failed">Failed</option>
</select>
<div className="absolute right-0 top-0 h-full pr-2 sm:pr-3 flex items-center pointer-events-none">
  <ChevronDown size={18} className="text-gray-400" />
</div>
```

### After (Shadcn Select)
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue placeholder="All Statuses" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">All Statuses</SelectItem>
    <SelectItem value="At Origin Branch">At Origin Branch</SelectItem>
    <SelectItem value="In Transit to Destination">In Transit</SelectItem>
    <SelectItem value="At Destination Branch">At Destination Branch</SelectItem>
    <SelectItem value="Assigned">Assigned</SelectItem>
    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
    <SelectItem value="Delivered">Delivered</SelectItem>
    <SelectItem value="Failed">Failed</SelectItem>
  </SelectContent>
</Select>
```

---

## Example 3: Converting Custom Modal to Shadcn Dialog

### Before (Current Custom Modal)
```typescript
{modalType === 'create' && (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 transform transition-all">
      <form onSubmit={handleCreateShipment} autoComplete="off">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Create New Shipment</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Enter sender, recipient, and package details below.</p>
        </div>
        {/* Form content */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-3 sm:px-4 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
          <button type="button" onClick={closeModal} className="...">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="...">Save</button>
        </div>
      </form>
    </div>
  </div>
)}
```

### After (Shadcn Dialog)
```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

<Dialog open={modalType === 'create'} onOpenChange={closeModal}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Create New Shipment</DialogTitle>
      <DialogDescription>
        Enter sender, recipient, and package details below.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleCreateShipment} autoComplete="off">
      {/* Form content */}
    </form>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={closeModal}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        Save
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Example 4: Converting Custom Input to Shadcn Input

### Before (Current Custom Input)
```typescript
<input 
  type="text" 
  placeholder="Sender's full name" 
  value={senderName} 
  onChange={(e) => setSenderName(e.target.value)} 
  autoComplete="off"
  className="form-input text-sm py-2" 
  required 
/>
```

### After (Shadcn Input)
```typescript
import { Input } from "@/components/ui/input"

<Input
  type="text"
  placeholder="Sender's full name"
  value={senderName}
  onChange={(e) => setSenderName(e.target.value)}
  autoComplete="off"
  required
/>
```

---

## Example 5: Converting Custom Badge to Shadcn Badge

### Before (Current Custom Status Badge)
```typescript
<span className={`px-3 py-1 text-sm font-medium rounded-full ${
  shipment.status === 'Delivered' ? 'bg-green-100 text-green-800' :
  shipment.status === 'In Transit to Destination' ? 'bg-indigo-100 text-indigo-800' :
  shipment.status === 'Failed' ? 'bg-red-100 text-red-800' :
  'bg-gray-100 text-gray-800'
}`}>
  {shipment.status}
</span>
```

### After (Shadcn Badge with Custom Logic)
```typescript
import { Badge } from "@/components/ui/badge"

const badgeVariant = {
  'Delivered': 'bg-green-100 text-green-800',
  'In Transit to Destination': 'bg-indigo-100 text-indigo-800',
  'Failed': 'bg-red-100 text-red-800',
}[shipment.status] || 'bg-gray-100 text-gray-800'

<Badge className={badgeVariant}>
  {shipment.status}
</Badge>
```

---

## Example 6: Converting Custom Table to Shadcn Table

### Before (Current Custom Table)
```typescript
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th scope="col" className="table-header">S/No</th>
      <th scope="col" className="table-header">Tracking ID</th>
      <th scope="col" className="table-header">Status</th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {shipments.map((shipment, index) => (
      <tr key={shipment._id} className="table-row">
        <td className="table-cell font-medium">{index + 1}</td>
        <td className="table-cell font-mono text-blue-600">{shipment.trackingId}</td>
        <td className="table-cell"><StatusBadge status={shipment.status} /></td>
      </tr>
    ))}
  </tbody>
</table>
```

### After (Shadcn Table)
```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>S/No</TableHead>
      <TableHead>Tracking ID</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {shipments.map((shipment, index) => (
      <TableRow key={shipment._id}>
        <TableCell className="font-medium">{index + 1}</TableCell>
        <TableCell className="font-mono text-blue-600">{shipment.trackingId}</TableCell>
        <TableCell><StatusBadge status={shipment.status} /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Example 7: Using Shadcn Date Picker

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"

export function DatePickerExample() {
  const [date, setDate] = useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          {date ? format(date, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(date) => date > new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
```

---

## 🎯 Migration Path

1. **Phase 1**: Replace buttons and badges (least risky)
2. **Phase 2**: Replace form inputs and selects
3. **Phase 3**: Replace modals and dialogs
4. **Phase 4**: Replace tables
5. **Phase 5**: Add advanced features (date pickers, custom styling)

Start with Phase 1 to get comfortable with the new components!

