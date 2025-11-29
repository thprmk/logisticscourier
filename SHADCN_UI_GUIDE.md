# Shadcn/ui Integration Guide

## ✅ Installed Components

All Shadcn/ui components are now available in your project at `app/components/ui/`

### Available Components:
- ✅ Button
- ✅ Dropdown Menu
- ✅ Select
- ✅ Dialog
- ✅ Calendar
- ✅ Table
- ✅ Form
- ✅ Input
- ✅ Textarea
- ✅ Badge
- ✅ Tabs
- ✅ Popover
- ✅ Scroll Area
- ✅ Separator

---

## 📚 Usage Examples

### 1. Button
```typescript
import { Button } from "@/components/ui/button"

export function MyComponent() {
  return (
    <>
      <Button>Default</Button>
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button disabled>Disabled</Button>
    </>
  )
}
```

### 2. Dropdown Menu
```typescript
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function DropdownMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 3. Select
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SelectDemo() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### 4. Dialog (Modal)
```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function DialogDemo() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

### 5. Calendar
```typescript
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"

export function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-md border"
    />
  )
}
```

### 6. Date Picker (Calendar + Popover)
```typescript
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"

export function DatePickerDemo() {
  const [date, setDate] = useState<Date>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {date ? format(date, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(date) =>
            date > new Date() || date < new Date("1900-01-01")
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
```

### 7. Table
```typescript
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const invoices = [
  {
    invoice: "INV-001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
  },
  {
    invoice: "INV-002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
  },
]

export function TableDemo() {
  return (
    <Table>
      <TableCaption>A list of your recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.invoice}>
            <TableCell className="font-medium">{invoice.invoice}</TableCell>
            <TableCell>{invoice.paymentStatus}</TableCell>
            <TableCell className="text-right">{invoice.totalAmount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### 8. Form with Validation
```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"

export function FormDemo() {
  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
    },
  })

  function onSubmit(values: any) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### 9. Badge
```typescript
import { Badge } from "@/components/ui/badge"

export function BadgeDemo() {
  return (
    <>
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </>
  )
}
```

### 10. Tabs
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function TabsDemo() {
  return (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content for Tab 1</TabsContent>
      <TabsContent value="tab2">Content for Tab 2</TabsContent>
    </Tabs>
  )
}
```

### 11. Input
```typescript
import { Input } from "@/components/ui/input"

export function InputDemo() {
  return (
    <>
      <Input type="email" placeholder="Email" />
      <Input type="text" placeholder="Text" />
      <Input disabled type="text" placeholder="Disabled" />
    </>
  )
}
```

### 12. Textarea
```typescript
import { Textarea } from "@/components/ui/textarea"

export function TextareaDemo() {
  return <Textarea placeholder="Type your message here." />
}
```

### 13. Separator
```typescript
import { Separator } from "@/components/ui/separator"

export function SeparatorDemo() {
  return (
    <div>
      <div>Above separator</div>
      <Separator className="my-4" />
      <div>Below separator</div>
    </div>
  )
}
```

### 14. Scroll Area
```typescript
import { ScrollArea } from "@/components/ui/scroll-area"

export function ScrollAreaDemo() {
  return (
    <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
      <div>Long content here...</div>
    </ScrollArea>
  )
}
```

---

## 🎨 Customization

### Button Variants
- `default` - Primary button
- `secondary` - Secondary button
- `destructive` - Danger/Delete button
- `outline` - Outlined button
- `ghost` - Ghost/Subtle button
- `link` - Link-style button

### Button Sizes
- `default` - Standard size
- `sm` - Small button
- `lg` - Large button
- `icon` - Icon-only button

### Badge Variants
- `default` - Standard badge
- `secondary` - Secondary badge
- `destructive` - Danger badge
- `outline` - Outlined badge

---

## 🔧 Best Practices

1. **Always use `asChild` prop** for compound components:
   ```typescript
   <DropdownMenuTrigger asChild>
     <Button>Open</Button>
   </DropdownMenuTrigger>
   ```

2. **Use form with validation**:
   - Install `react-hook-form` and `zod` for validation
   ```bash
   npm install react-hook-form zod @hookform/resolvers
   ```

3. **Responsive design**:
   ```typescript
   <div className="w-full md:w-1/2">
     {/* Content scales on mobile/tablet */}
   </div>
   ```

4. **Dark mode support** - All components support dark mode automatically via Tailwind CSS

---

## 📦 Dependencies Added

- `@radix-ui/*` - Headless UI components
- `@hookform/resolvers` - Form validation
- `react-hook-form` - Form state management
- `date-fns` - Date utilities
- `class-variance-authority` - Component styling
- `clsx` - Class name utilities

---

## 🚀 Next Steps

1. Replace old custom components with Shadcn components
2. Update your pages to use the new Shadcn components
3. Test all UI interactions
4. Customize theme colors in `globals.css` if needed

---

## 📖 Official Documentation

- [Shadcn/ui Docs](https://ui.shadcn.com)
- [Radix UI Docs](https://www.radix-ui.com/docs/primitives/overview/introduction)
- [Tailwind CSS Docs](https://tailwindcss.com)

