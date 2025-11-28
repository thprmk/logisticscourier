"use client"
import { useState, useEffect, type FormEvent, useMemo } from "react"
import { useUser } from "../../context/UserContext"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Eye, Search, Building, PackageIcon, Filter, CheckSquare, Square, Download,X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Badge } from "@/components/ui/badge"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// Mock data types for demonstration
interface Branch {
  _id: string
  name: string
}

interface Driver {
  _id: string
  name: string
}

interface Shipment {
  _id: string
  trackingId: string
  status: string
  createdAt: string
  sender: { name: string; address: string; phone: string }
  recipient: { name: string; address: string; phone: string }
  packageInfo: { weight: number; type: string }
  assignedTo: Driver | null
  originBranch: Branch
  destinationBranch: Branch | null
  statusHistory?: { status: string; timestamp: string; notes?: string }[]
  failureReason?: string
  deliveryProof?: { type: string; url: string }
}

// Mock API data (replace with actual API calls)
const mockBranches: Branch[] = [
  { _id: "b1", name: "Main Branch" },
  { _id: "b2", name: "North Branch" },
  { _id: "b3", name: "South Branch" },
]

const mockDrivers: Driver[] = [
  { _id: "d1", name: "Alice Smith" },
  { _id: "d2", name: "Bob Johnson" },
  { _id: "d3", name: "Charlie Brown" },
]

const mockShipments: Shipment[] = [
  {
    _id: "s1",
    trackingId: "TRK123456789",
    status: "Delivered",
    createdAt: "2023-10-26T10:00:00Z",
    sender: { name: "John Doe", address: "123 Main St", phone: "+1 (555) 123-4567" },
    recipient: { name: "Jane Smith", address: "456 Oak Ave", phone: "+1 (555) 987-6543" },
    packageInfo: { weight: 5, type: "Parcel" },
    assignedTo: mockDrivers[0],
    originBranch: mockBranches[0],
    destinationBranch: mockBranches[1],
  },
  {
    _id: "s2",
    trackingId: "TRK987654321",
    status: "In Transit",
    createdAt: "2023-10-25T14:30:00Z",
    sender: { name: "Peter Jones", address: "789 Pine Ln", phone: "+1 (555) 111-2222" },
    recipient: { name: "Mary Brown", address: "101 Maple Dr", phone: "+1 (555) 333-4444" },
    packageInfo: { weight: 2, type: "Document" },
    assignedTo: null,
    originBranch: mockBranches[1],
    destinationBranch: mockBranches[0],
  },
  {
    _id: "s3",
    trackingId: "TRK112233445",
    status: "Failed",
    createdAt: "2023-10-24T09:00:00Z",
    sender: { name: "Alice Williams", address: "202 Birch Rd", phone: "+1 (555) 555-6666" },
    recipient: { name: "Bob Davis", address: "303 Cedar Ct", phone: "+1 (555) 777-8888" },
    packageInfo: { weight: 10, type: "Fragile" },
    assignedTo: mockDrivers[1],
    originBranch: mockBranches[2],
    destinationBranch: mockBranches[1],
  },
  {
    _id: "s4",
    trackingId: "TRK556677889",
    status: "Out for Delivery",
    createdAt: "2023-10-27T11:00:00Z",
    sender: { name: "Eve Adams", address: "404 Elm St", phone: "+1 (555) 222-1111" },
    recipient: { name: "Frank Wilson", address: "505 Walnut Ave", phone: "+1 (555) 444-3333" },
    packageInfo: { weight: 3, type: "Parcel" },
    assignedTo: mockDrivers[2],
    originBranch: mockBranches[0],
    destinationBranch: mockBranches[2],
  },
]

const PAGE_SIZE = 10

const StatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
  let bgColor = "bg-slate-100"
  let textColor = "text-slate-700"

  if (status === "Delivered") {
    variant = "secondary"
    bgColor = "bg-emerald-100"
    textColor = "text-emerald-700"
  } else if (status === "Failed") {
    variant = "destructive"
    bgColor = "bg-red-100"
    textColor = "text-red-700"
  } else if (status === "In Transit") {
    variant = "default"
    bgColor = "bg-blue-100"
    textColor = "text-blue-700"
  } else if (status === "At Origin Branch") {
    bgColor = "bg-orange-100"
    textColor = "text-orange-700"
  } else if (status === "At Destination Branch") {
    bgColor = "bg-purple-100"
    textColor = "text-purple-700"
  } else if (status === "Assigned") {
    bgColor = "bg-cyan-100"
    textColor = "text-cyan-700"
  } else if (status === "Out for Delivery") {
    bgColor = "bg-indigo-100"
    textColor = "text-indigo-700"
  }

  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${bgColor} ${textColor} inline-block`}>
      {status}
    </span>
  )
}

export default function ShipmentsPage() {
  const { user } = useUser()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [filterAssignedTo, setFilterAssignedTo] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAssignStaff, setBulkAssignStaff] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)

  // Create shipment form state
  const [senderName, setSenderName] = useState("")
  const [senderAddress, setSenderAddress] = useState("")
  const [senderPhone, setSenderPhone] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [originBranchId, setOriginBranchId] = useState("")
  const [destinationBranchId, setDestinationBranchId] = useState("")
  const [packageWeight, setPackageWeight] = useState(0)
  const [packageType, setPackageType] = useState("")
  const [assignedStaff, setAssignedStaff] = useState("")

  // Update shipment form state
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateAssignedTo, setUpdateAssignedTo] = useState("")
  const [updateNotes, setUpdateNotes] = useState("")

  const [branches, setBranches] = useState<Branch[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

  const isLocalDelivery = useMemo(() => {
    if (!destinationBranchId || !originBranchId) return false
    return originBranchId === destinationBranchId
  }, [originBranchId, destinationBranchId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Starting data fetch...")

      const [shipmentsRes, driversRes, branchesRes] = await Promise.all([
        fetch("/api/shipments", { credentials: "include" }),
        fetch("/api/users?role=staff", { credentials: "include" }),
        fetch("/api/tenants", { credentials: "include" }),
      ])

      console.log("[v0] Response statuses:", {
        shipments: shipmentsRes.status,
        drivers: driversRes.status,
        branches: branchesRes.status,
      })

      if (!shipmentsRes.ok) throw new Error("Failed to fetch shipments")
      if (!driversRes.ok) throw new Error("Failed to fetch drivers")
      if (!branchesRes.ok) throw new Error("Failed to fetch branches")

      const shipmentsData = await shipmentsRes.json()
      const driversData = await driversRes.json()
      const branchesData = await branchesRes.json()

      console.log("[v0] Data fetched successfully")

      setShipments(shipmentsData)
      setDrivers(driversData)
      setBranches(branchesData)

      if (user?.tenantId && !originBranchId) {
        setOriginBranchId(user.tenantId)
      }
    } catch (error: any) {
      console.error("[v0] Error fetching data:", error)
      toast.error(`Failed to load shipments: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredShipments = useMemo(() => {
    let results = shipments

    if (searchQuery) {
      results = results.filter(
        (shipment) =>
          shipment.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shipment.recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter) {
      results = results.filter((shipment) => shipment.status === statusFilter)
    }

    if (filterAssignedTo) {
      results = results.filter((shipment) => shipment.assignedTo?._id === filterAssignedTo)
    }

    if (filterStartDate && filterEndDate) {
      const startDate = new Date(filterStartDate)
      const endDate = new Date(filterEndDate)
      // Set end date to end of day to include all shipments from that day
      endDate.setHours(23, 59, 59, 999)
      results = results.filter((shipment) => {
        const shipmentDate = new Date(shipment.createdAt)
        return shipmentDate >= startDate && shipmentDate <= endDate
      })
    }

    return results
  }, [shipments, searchQuery, statusFilter, filterAssignedTo, filterStartDate, filterEndDate])

  const totalPages = Math.ceil(filteredShipments.length / PAGE_SIZE)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex)

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedShipments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedShipments.map((shipment) => shipment._id)))
    }
  }

  const toggleSelectShipment = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const resetForms = () => {
    setSenderName("")
    setSenderAddress("")
    setSenderPhone("")
    setRecipientName("")
    setRecipientAddress("")
    setRecipientPhone("")
    setOriginBranchId(user?.tenantId || "") // Set default to user's tenantId if available
    setDestinationBranchId("")
    setPackageWeight(0)
    setPackageType("")
    setAssignedStaff("")
    setSelectedShipment(null)
  }

  const handleCreateShipment = async (e: FormEvent) => {
    e.preventDefault()

    if (!originBranchId) {
      toast.error("Origin branch is required")
      return
    }
    if (!destinationBranchId) {
      toast.error("Please select a destination branch")
      return
    }
    if (!senderName || !senderAddress || !senderPhone) {
      toast.error("Please fill in all sender details")
      return
    }
    if (!recipientName || !recipientAddress || !recipientPhone) {
      toast.error("Please fill in all recipient details")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading("Creating new shipment...")

    const newShipmentData = {
      sender: { name: senderName, address: senderAddress, phone: senderPhone },
      recipient: { name: recipientName, address: recipientAddress, phone: recipientPhone },
      packageInfo: { weight: packageWeight, type: packageType },
      originBranchId: originBranchId,
      destinationBranchId: destinationBranchId,
      assignedTo: assignedStaff || undefined,
    }

    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShipmentData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create shipment")
      }

      toast.success("Shipment created successfully", { id: toastId })
      setIsCreateDialogOpen(false)
      resetForms()
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to create shipment", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateShipment = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedShipment) return

    setIsSubmitting(true)
    const toastId = toast.loading(`Updating shipment ${selectedShipment.trackingId}...`)

    const updatePayload = {
      status: updateStatus,
      assignedTo: updateAssignedTo || null,
      notes: updateNotes,
    }

    try {
      const res = await fetch(`/api/shipments/${selectedShipment._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update shipment")
      }

      toast.success("Shipment updated successfully", { id: toastId })
      setIsUpdateDialogOpen(false)
      setSelectedShipment(null)
      setUpdateStatus("")
      setUpdateAssignedTo("")
      setUpdateNotes("")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to update shipment", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteShipment = async () => {
    if (!selectedShipment) return

    setIsSubmitting(true)
    const toastId = toast.loading(`Deleting shipment ${selectedShipment.trackingId}...`)

    try {
      const res = await fetch(`/api/shipments/${selectedShipment._id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to delete shipment")
      }

      toast.success("Shipment deleted successfully", { id: toastId })
      setIsDeleteDialogOpen(false)
      setSelectedShipment(null)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete shipment", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one shipment")
      return
    }

    // Confirmation is handled in the UI, proceed with deletion
    setIsSubmitting(true)
    const toastId = toast.loading(`Deleting ${selectedIds.size} shipments...`)

    try {
      const shipmentIds = Array.from(selectedIds)
      const results = await Promise.all(
        shipmentIds.map((id) =>
          fetch(`/api/shipments/${id}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      )

      const allSuccess = results.every((r) => r.ok)
      if (!allSuccess) throw new Error("Some deletions failed")

      toast.success(`Successfully deleted ${shipmentIds.length} shipments`, { id: toastId })
      setSelectedIds(new Set())
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete shipments", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one shipment")
      return
    }

    if (!bulkAssignStaff) {
      toast.error("Please select a staff member")
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading(`Assigning ${selectedIds.size} shipments...`)

    try {
      const shipmentIds = Array.from(selectedIds)
      const results = await Promise.all(
        shipmentIds.map((id) =>
          fetch(`/api/shipments/${id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignedTo: bulkAssignStaff }),
          }),
        ),
      )

      const allSuccess = results.every((r) => r.ok)
      if (!allSuccess) throw new Error("Some assignments failed")

      toast.success(`Successfully assigned ${shipmentIds.length} shipments`, { id: toastId })
      setSelectedIds(new Set())
      setBulkAssignStaff("")
      fetchData()
    } catch (error: any) {
      toast.error(error.message || "Failed to assign shipments", { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearFiltersAndState = () => {
    setSearchQuery("")
    setStatusFilter("")
    setFilterAssignedTo("")
    setFilterStartDate("")
    setFilterEndDate("")
    setSelectedIds(new Set())
    setBulkAssignStaff("")
    setCurrentPage(1)
  }

  const openModal = (type: "view" | "update" | "delete", shipment: Shipment) => {
    setSelectedShipment(shipment)

     if (type === "view") {
      setIsViewSheetOpen(true) // We now open the Sheet
    } 

    else if (type === "update") {
      setUpdateStatus(shipment.status)
      setUpdateAssignedTo(shipment.assignedTo?._id || "")
      setUpdateNotes("") // Reset notes on open
       setIsUpdateDialogOpen(true)
    }
     else if (type === "delete") {
      setIsDeleteDialogOpen(true)
    }
  }

  const canAssignToStaff = useMemo(() => {
    return (
      selectedIds.size > 0 &&
      (statusFilter === "At Origin Branch" ||
        statusFilter === "At Destination Branch" ||
        statusFilter === "Assigned" ||
        statusFilter === "") // Allow if no status filter is applied
    )
  }, [selectedIds.size, statusFilter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">Shipment Management</h1>
            <p className="text-slate-600 text-sm">Create, track, and manage all shipments for your branch.</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForms} className="w-full sm:w-auto h-11 gap-2">
                <Plus size={20} />
                <span>New Shipment</span>
              </Button>
            </DialogTrigger>

          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white shadow-2xl">
              <form onSubmit={handleCreateShipment}>
                
                {/* Header: Added 'flex justify-between' so the X button sits on the right */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 ">
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold text-gray-900">Create New Shipment</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                      Enter sender, recipient, and package details below.
                    </DialogDescription>
                  </div>
               
                  {/* <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={18} />
                  </Button> */}
                </div>

                <div className="p-6 space-y-8">
                  
                  {/* 1. SENDER & RECIPIENT ROW */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    
                    {/* Sender Column */}
                    <div className="space-y-3">
                       <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Sender</h3>
                       
                       <div className="space-y-1">
                          <Label htmlFor="s-name" className="text-[11px] font-medium text-slate-500 uppercase ">Full Name</Label>
                          <Input id="s-name" placeholder="John Doe" value={senderName} onChange={e => setSenderName(e.target.value)} className="h-9 text-sm" required />
                       </div>
                       
                       <div className="space-y-1">
                          <Label htmlFor="s-addr" className="text-[11px] font-medium text-slate-500 uppercase">Full Address</Label>
                          <Input id="s-addr" placeholder="123 Main St" value={senderAddress} onChange={e => setSenderAddress(e.target.value)} className="h-9 text-sm" required />
                       </div>
                       
                       <div className="space-y-1">
                          <Label htmlFor="s-phone" className="text-[11px] font-medium text-slate-500 uppercase">Phone</Label>
                          <Input id="s-phone" placeholder="+1 234..." value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="h-9 text-sm" required />
                       </div>
                    </div>

                    {/* Recipient Column */}
                    <div className="space-y-3">
                       <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Recipient</h3>
                       
                       <div className="space-y-1">
                          <Label htmlFor="r-name" className="text-[11px] font-medium text-slate-500 uppercase">Full Name</Label>
                          <Input id="r-name" placeholder="Jane Smith" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="h-9 text-sm" required />
                       </div>
                       
                       <div className="space-y-1">
                          <Label htmlFor="r-addr" className="text-[11px] font-medium text-slate-500 uppercase">Full Address</Label>
                          <Input id="r-addr" placeholder="456 Oak Ave" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="h-9 text-sm" required />
                       </div>
                       
                       <div className="space-y-1">
                          <Label htmlFor="r-phone" className="text-[11px] font-medium text-slate-500 uppercase">Phone</Label>
                          <Input id="r-phone" placeholder="+1 987..." value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="h-9 text-sm" required />
                       </div>
                    </div>
                  </div>

                  {/* 2. BRANCH DETAILS */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Route Details</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-slate-500 uppercase">Origin</Label>
                          <Input 
                            disabled 
                            value={branches.find(b => b._id === originBranchId)?.name || 'Loading...'} 
                            className="h-9 bg-slate-50 border-slate-200 text-slate-900 font-medium disabled:opacity-100 disabled:cursor-default"
                          />
                       </div>
                       
                       <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-slate-500 uppercase">Destination</Label>
                          <Select 
                            value={destinationBranchId} 
                            onValueChange={(val) => {
                                setDestinationBranchId(val);
                                if (val !== originBranchId) setAssignedStaff("");
                            }}
                          >
                              <SelectTrigger className="h-9 focus:ring-blue-500 text-slate-900">
                                <SelectValue placeholder="Select Destination" />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch._id} value={branch._id}>
                                      {branch.name}
                                    </SelectItem>
                                ))}
                              </SelectContent>
                          </Select>
                       </div>
                    </div>

                    {/* Compact Alert - Fixed dynamic text for Local Delivery */}
                    {destinationBranchId && (
                      <div className={`mt-2 p-2.5 rounded-md text-xs font-medium border flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
                        isLocalDelivery 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-blue-50 border-blue-100 text-blue-700'
                      }`}>
                         {isLocalDelivery 
                          ? `📍 Local Delivery: This package stays in ${branches.find(b => b._id === destinationBranchId)?.name || 'this branch'}. Assign a driver below.`
                          : `🚚 Inter-Branch Transfer: This package will be sent to ${branches.find(b => b._id === destinationBranchId)?.name}. It will require a manifest dispatch.`
                         }
                      </div>
                    )}
                  </div>

                  {/* 3. PACKAGE DETAILS */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Package Info</h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-slate-500 uppercase">Weight (kg)</Label>
                            <Input 
                              type="number" 
                              value={packageWeight || ''} 
                              onChange={e => setPackageWeight(parseFloat(e.target.value))}
                              className="h-9"
                              placeholder="0.0"
                              min="0.1" step="0.1" required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-slate-500 uppercase">Type</Label>
                            <Select value={packageType} onValueChange={setPackageType}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Parcel">Parcel</SelectItem>
                                    <SelectItem value="Document">Document</SelectItem>
                                    <SelectItem value="Fragile">Fragile</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-slate-500 uppercase">Assign Staff</Label>
                            <Select 
                              value={assignedStaff} 
                              onValueChange={setAssignedStaff} 
                              disabled={!isLocalDelivery}
                            >
                                <SelectTrigger className={`h-9 ${!isLocalDelivery ? "bg-slate-50 opacity-60" : ""}`}>
                                   <SelectValue placeholder={!isLocalDelivery ? "N/A" : "Select Staff"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                    {drivers.map(d => (
                                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                  </div>

                </div>

                {/* Footer with background */}
                <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 sm:justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)} className="h-9 px-4 text-xs font-medium bg-white hover:bg-slate-50">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm">
                    {isSubmitting ? "Creating..." : "Create Shipment"}
                  </Button>
                </DialogFooter>

              </form>
            </DialogContent>

          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-4">
              <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search tracking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            {/* Status & Staff - Right side */}
            <div className="lg:col-span-3 flex gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="At Origin Branch">At Origin</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="At Destination Branch">At Destination</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Staff Filter */}
              <Select
                value={filterAssignedTo}
                onValueChange={(value) => setFilterAssignedTo(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-10 flex-1">
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="lg:col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon size={18} className="mr-2" />
                  <span className="truncate">
                    {filterStartDate && filterEndDate ? (
                      <>
                        {format(new Date(filterStartDate), "MMM dd")} - {format(new Date(filterEndDate), "MMM dd")}
                      </>
                    ) : (
                      "Date range"
                    )}
                  </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filterStartDate ? new Date(filterStartDate) : new Date()}
                  selected={{
                    from: filterStartDate ? new Date(filterStartDate) : undefined,
                    to: filterEndDate ? new Date(filterEndDate) : undefined,
                  }}
                  onSelect={(range) => {
                    setFilterStartDate(range?.from ? format(range.from, "yyyy-MM-dd") : "")
                    setFilterEndDate(range?.to ? format(range.to, "yyyy-MM-dd") : "")
                  }}
                  numberOfMonths={2}
                />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Button */}
            <Button variant="outline" onClick={clearFiltersAndState} className="h-10 lg:col-span-2 w-full bg-transparent">
              Clear All
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {selectedIds.size}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedIds.size === 1 ? "Shipment" : "Shipments"} selected
                  </p>
                  <p className="text-xs text-slate-600">Choose an action</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={bulkAssignStaff}
                  onValueChange={(value) => setBulkAssignStaff(value === "unassigned" ? "" : value)}
                  disabled={!canAssignToStaff}
                >
                  <SelectTrigger className="h-10 w-full sm:w-48">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Select staff</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver._id} value={driver._id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={handleBulkAssign}
                  disabled={!canAssignToStaff || !bulkAssignStaff || isSubmitting}
                  className="h-10"
                >
                  {isSubmitting ? "Assigning..." : "Assign"}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isSubmitting}
                  className="h-10"
                >
                  {isSubmitting ? "Deleting..." : "Delete"}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-10">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[50px] py-4">
                  <Button variant="ghost" size="icon" onClick={toggleSelectAll} className="h-8 w-8">
                    {selectedIds.size === filteredShipments.length && filteredShipments.length > 0 ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} className="text-slate-400" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">S/No</TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Tracking ID
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Recipient
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Staff
                </TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Date
                </TableHead>
                <TableHead className="py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600"></div>
                      <p className="text-sm text-slate-500">Loading shipments...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedShipments.length > 0 ? (
                paginatedShipments.map((shipment, index) => (
                  <TableRow
                    key={shipment._id}
                    data-state={selectedIds.has(shipment._id) && "selected"}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSelectShipment(shipment._id)}
                        className="h-8 w-8"
                      >
                        {selectedIds.has(shipment._id) ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} className="text-slate-300" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="py-3 text-sm font-semibold text-slate-900">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="py-3 font-mono text-sm text-blue-600 font-semibold">
                      {shipment.trackingId}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-sm font-medium text-slate-900">{shipment.recipient.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{shipment.recipient.address}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <StatusBadge status={shipment.status} />
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {shipment.assignedTo?.name ? (
                        <span className="text-slate-900 font-medium">{shipment.assignedTo.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-600">
                      {new Date(shipment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
               <TableCell className="text-right">
   <div className="flex justify-end gap-1">
      {/* View Button */}
      <Button variant="ghost" size="icon" onClick={() => openModal("view", shipment)} className="h-8 w-8 hover:text-blue-600">
         <Eye size={16} />
      </Button>
      
      {/* Edit Button */}
      <Button variant="ghost" size="icon" onClick={() => openModal("update", shipment)} className="h-8 w-8 hover:text-orange-600">
         <Edit size={16} />
      </Button>
      
      {/* Delete Button */}
      <Button variant="ghost" size="icon" onClick={() => openModal("delete", shipment)} className="h-8 w-8 hover:text-red-600">
         <Trash2 size={16} />
      </Button>
   </div>
</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageIcon size={32} className="text-slate-300" />
                      <p className="text-sm text-slate-500 font-medium">No shipments found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {filteredShipments.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{" "}
                <span className="font-semibold text-slate-900">{Math.min(endIndex, filteredShipments.length)}</span> of{" "}
                <span className="font-semibold text-slate-900">{filteredShipments.length}</span> items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9"
                >
                  Previous
                </Button>
                <div className="text-sm text-slate-600 px-2">
                  Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                  <span className="font-semibold text-slate-900">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

       <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-[90vw] overflow-y-auto bg-white p-0">
          
          {/* Sticky Header */}
          <SheetHeader className="px-6 py-4 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
             <SheetTitle className="text-xl font-bold text-slate-900">Shipment Details</SheetTitle>
             <SheetDescription className="flex items-center gap-2">
                Tracking ID: 
                <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs">
                  {selectedShipment?.trackingId}
                </span>
             </SheetDescription>
          </SheetHeader>
          
          {selectedShipment && (
             <div className="px-6 py-6 space-y-8">
                
                {/* 1. Status Section (Hero Card) */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Current Status</p>
                        <StatusBadge status={selectedShipment.status} />
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assigned Driver</p>
                        {selectedShipment.assignedTo ? (
                          <div className="flex items-center sm:justify-end gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {selectedShipment.assignedTo.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-900">{selectedShipment.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-sm">Unassigned</span>
                        )}
                    </div>
                </div>

                {/* 2. Addresses (Grid Layout with Equal Heights) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Sender Card */}
                    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
                           <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div> Sender
                           </h4>
                        </div>
                        <div className="p-4 flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{selectedShipment.sender.name}</p>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{selectedShipment.sender.address}</p>
                            <div className="mt-3 pt-3 border-t border-slate-50">
                               <p className="text-xs text-slate-400 font-medium">Phone</p>
                               <p className="text-sm text-slate-700">{selectedShipment.sender.phone}</p>
                            </div>
                        </div>
                    </div>

                    {/* Recipient Card */}
                    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
                           <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Recipient
                           </h4>
                        </div>
                        <div className="p-4 flex-1">
                            <p className="font-semibold text-slate-900 text-sm">{selectedShipment.recipient.name}</p>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{selectedShipment.recipient.address}</p>
                            <div className="mt-3 pt-3 border-t border-slate-50">
                               <p className="text-xs text-slate-400 font-medium">Phone</p>
                               <p className="text-sm text-slate-700">{selectedShipment.recipient.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Package Info */}
                <div>
                   <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Package Details</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                         <p className="text-xs text-slate-400 mb-1">Type</p>
                         <p className="font-medium text-slate-900">{selectedShipment.packageInfo.type}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                         <p className="text-xs text-slate-400 mb-1">Weight</p>
                         <p className="font-medium text-slate-900">{selectedShipment.packageInfo.weight} kg</p>
                      </div>
                   </div>
                </div>


            {selectedShipment.deliveryProof && selectedShipment.deliveryProof.url && (
                   <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Proof of Delivery</h4>
                      
                      <div 
                        className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={() => setIsImageViewerOpen(true)}
                      >
                         {/* Thumbnail */}
                         <div className="relative w-24 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                             <img 
                               src={selectedShipment.deliveryProof.url} 
                               alt="Proof" 
                               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                             />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={20} />
                             </div>
                         </div>

                         {/* Text & Button */}
                         <div className="flex flex-col justify-between h-20 py-0.5">
                             <div>
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Delivery Photo</p>
                                <p className="text-xs text-slate-500 capitalize">{selectedShipment.deliveryProof.type} verification</p>
                             </div>
                             <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
                                Click to view
                             </div>
                         </div>
                      </div>
                   </div>
                )}


                {/* 4. Timeline (Fixed Alignment) */}
                <div className="pb-10">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Tracking History</h4>
                    <div className="ml-2">
                        {selectedShipment.statusHistory?.map((history, idx) => (
                            <div key={idx} className="relative pl-8 pb-8 last:pb-0">
                                {/* Line */}
                                {idx !== (selectedShipment.statusHistory?.length || 0) - 1 && (
                                  <div className="absolute left-[7px] top-2 h-full w-[2px] bg-slate-200"></div>
                                )}
                                
                                {/* Dot */}
                                <div className={`absolute left-0 top-1 h-4 w-4 rounded-full border-2 ${idx === 0 ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'} z-10`}></div>
                                
                                {/* Content */}
                                <div>
                                    <p className={`text-sm font-medium ${idx === 0 ? 'text-blue-700' : 'text-slate-900'}`}>
                                      {history.status}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {format(new Date(history.timestamp), "MMM dd, yyyy • hh:mm a")}
                                    </p>
                                    {history.notes && (
                                        <div className="mt-2 bg-amber-50 text-amber-800 text-xs p-2.5 rounded border border-amber-100 inline-block">
                                            {history.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 2. UPDATE DIALOG */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Update Status</DialogTitle>
               <DialogDescription>Change status for {selectedShipment?.trackingId}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateShipment} className="space-y-4">
               <div>
                  <Label>Status</Label>
                  <Select value={updateStatus} onValueChange={setUpdateStatus}>
                     <SelectTrigger><SelectValue /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="At Origin Branch">At Origin Branch</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="At Destination Branch">At Destination Branch</SelectItem>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div>
                   <Label>Assign Staff</Label>
                   <Select value={updateAssignedTo} onValueChange={setUpdateAssignedTo}>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="unassigned">Unassigned</SelectItem>
                         {drivers.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
               </div>
               <div>
                  <Label>Notes</Label>
                  <Input value={updateNotes} onChange={e => setUpdateNotes(e.target.value)} placeholder="Optional notes" />
               </div>
               <DialogFooter>
                   <Button type="button" variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
                   <Button type="submit" disabled={isSubmitting}>Update</Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>

      {/* 3. DELETE DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
             <DialogHeader>
                <DialogTitle>Delete Shipment</DialogTitle>
                <DialogDescription>Are you sure you want to delete {selectedShipment?.trackingId}? This cannot be undone.</DialogDescription>
             </DialogHeader>
             <DialogFooter>
                 <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                 <Button variant="destructive" onClick={handleDeleteShipment} disabled={isSubmitting}>Delete</Button>
             </DialogFooter>
          </DialogContent>
      </Dialog>


      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="sm:max-w-screen-lg w-auto bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center gap-4">
            
            {/* The Image */}
            <div className="relative rounded-lg overflow-hidden shadow-2xl bg-black/50 backdrop-blur-sm">
                {selectedShipment?.deliveryProof?.url && (
                    <img 
                        src={selectedShipment.deliveryProof.url} 
                        alt="Full proof" 
                        className="max-h-[80vh] w-auto object-contain rounded-md"
                    />
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button 
                    variant="secondary" 
                    onClick={async () => {
                        if (!selectedShipment?.deliveryProof?.url) return;
                        try {
                            const response = await fetch(selectedShipment.deliveryProof.url);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `proof-${selectedShipment.trackingId}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast.success("Download started");
                        } catch (e) {
                            console.error(e);
                            // Fallback if fetch fails (CORS issues etc)
                            window.open(selectedShipment.deliveryProof.url, '_blank');
                        }
                    }}
                    className="bg-white/90 hover:bg-white text-slate-900 shadow-lg"
                >
                    <Download size={16} className="mr-2" /> Download
                </Button>
                
                <Button 
                    variant="default" 
                    onClick={() => setIsImageViewerOpen(false)}
                    className="bg-slate-900 text-white shadow-lg border border-slate-700"
                >
                    Close
                </Button>
            </div>
        </DialogContent>
      </Dialog>


    </div> 
  )
}
