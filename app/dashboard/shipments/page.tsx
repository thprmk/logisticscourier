"use client"
import { useState, useEffect, type FormEvent, useMemo } from "react"
import { useUser } from "../../context/UserContext"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Eye, Search, Building, PackageIcon, Filter, CheckSquare, Square } from "lucide-react"
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
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
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
      results = results.filter((shipment) => shipment.trackingId.toLowerCase().includes(searchQuery.toLowerCase()))
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
    if (type === "update") {
      setUpdateStatus(shipment.status)
      setUpdateAssignedTo(shipment.assignedTo?._id || "")
      setUpdateNotes("") // Reset notes on open
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
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">Shipments</h1>
            <p className="text-slate-600 text-sm">Manage and track all deliveries efficiently</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForms} className="w-full sm:w-auto h-11 gap-2">
                <Plus size={20} />
                <span>New Shipment</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
              <form onSubmit={handleCreateShipment}>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl">Create New Shipment</DialogTitle>
                  <DialogDescription className="text-sm">Add sender, recipient, and package information</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  {/* Sender & Recipient in grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sender Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-xs">1</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm">Sender</h3>
                      </div>
                      <div className="grid gap-2.5">
                        <div>
                          <Label htmlFor="sender-name" className="text-slate-700 text-xs font-medium mb-1">
                            Full Name
                          </Label>
                          <Input
                            id="sender-name"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="John Doe"
                            required
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sender-address" className="text-slate-700 text-xs font-medium mb-1">
                            Address
                          </Label>
                          <Input
                            id="sender-address"
                            value={senderAddress}
                            onChange={(e) => setSenderAddress(e.target.value)}
                            placeholder="Street address"
                            required
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sender-phone" className="text-slate-700 text-xs font-medium mb-1">
                            Phone
                          </Label>
                          <Input
                            id="sender-phone"
                            type="tel"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            required
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recipient Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-semibold text-xs">2</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm">Recipient</h3>
                      </div>
                      <div className="grid gap-2.5">
                        <div>
                          <Label htmlFor="recipient-name" className="text-slate-700 text-xs font-medium mb-1">
                            Full Name
                          </Label>
                          <Input
                            id="recipient-name"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Jane Smith"
                            required
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="recipient-address" className="text-slate-700 text-xs font-medium mb-1">
                            Address
                          </Label>
                          <Input
                            id="recipient-address"
                            value={recipientAddress}
                            onChange={(e) => setRecipientAddress(e.target.value)}
                            placeholder="Street address"
                            required
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="recipient-phone" className="text-slate-700 text-xs font-medium mb-1">
                            Phone
                          </Label>
                          <Input
                            id="recipient-phone"
                            type="tel"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            required
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Branch Details */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Building size={16} className="text-slate-600" />
                      <h3 className="font-semibold text-slate-900 text-sm">Branch</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-700 text-xs font-medium mb-1 block">Origin</Label>
                        <Select value={originBranchId} onValueChange={setOriginBranchId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select origin branch" />
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
                      <div>
                        <Label className="text-slate-700 text-xs font-medium mb-1 block">Destination</Label>
                        <Select value={destinationBranchId} onValueChange={setDestinationBranchId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select branch" />
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
                    {destinationBranchId && (
                      <div
                        className={`mt-3 p-2 rounded-lg text-xs font-medium ${
                          isLocalDelivery
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                            : "bg-blue-50 text-blue-900 border border-blue-200"
                        }`}
                      >
                        {isLocalDelivery ? (
                          <span>✓ Local delivery - can assign staff immediately</span>
                        ) : (
                          <span>→ Inter-branch transfer required</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Package Details */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <PackageIcon size={16} className="text-slate-600" />
                      <h3 className="font-semibold text-slate-900 text-sm">Package</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <Label className="text-slate-700 text-xs font-medium mb-1 block">Weight (kg)</Label>
                        <Input
                          type="number"
                          value={packageWeight}
                          onChange={(e) => setPackageWeight(Number.parseFloat(e.target.value))}
                          required
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700 text-xs font-medium mb-1 block">Type</Label>
                        <Select value={packageType} onValueChange={setPackageType}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Parcel">Parcel</SelectItem>
                            <SelectItem value="Document">Document</SelectItem>
                            <SelectItem value="Fragile">Fragile</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-700 text-xs font-medium mb-1 block">
                          Staff{" "}
                          {!isLocalDelivery && <span className="text-xs font-normal text-slate-500">(local only)</span>}
                        </Label>
                        <Select
                          value={assignedStaff}
                          onValueChange={(value) => setAssignedStaff(value === "unassigned" ? "" : value)}
                          disabled={!isLocalDelivery}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">None</SelectItem>
                            {drivers.map((driver) => (
                              <SelectItem key={driver._id} value={driver._id}>
                                {driver.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6">
                  <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)} className="text-sm">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="text-sm">
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

            {/* ... existing code ...

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
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">ID</TableHead>
                <TableHead className="py-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Tracking
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
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-600">
                      {new Date(shipment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog
                          open={isViewDialogOpen && selectedShipment?._id === shipment._id}
                          onOpenChange={setIsViewDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                openModal("view", shipment)
                                setIsViewDialogOpen(true)
                              }}
                              className="h-8 w-8"
                              title="View"
                            >
                              <Eye size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-xl">Shipment Details - {selectedShipment?.trackingId}</DialogTitle>
                            </DialogHeader>

                            <div className="py-3 space-y-4 text-sm">
                              {/* Tracking & Status Info */}
                              <div className="grid grid-cols-4 gap-3 bg-slate-50 rounded-lg p-4">
                                <div>
                                  <p className="text-slate-600 text-xs mb-1">Tracking ID</p>
                                  <p className="font-semibold text-slate-900 text-sm">{selectedShipment?.trackingId}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600 text-xs mb-2">Status</p>
                                  <StatusBadge status={selectedShipment?.status || ""} />
                                </div>
                                <div>
                                  <p className="text-slate-600 text-xs mb-1">Created Date</p>
                                  <p className="font-medium text-slate-900 text-sm">{selectedShipment?.createdAt ? new Date(selectedShipment.createdAt).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-600 text-xs mb-1">Assigned Staff</p>
                                  <p className="font-medium text-slate-900 text-sm">{selectedShipment?.assignedTo?.name || 'Unassigned'}</p>
                                </div>
                              </div>

                              {/* Sender Info */}
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">S</span>
                                  Sender Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-blue-700">Name:</span>
                                    <span className="font-medium text-blue-900">{selectedShipment?.sender.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-blue-700">Address:</span>
                                    <span className="font-medium text-blue-900 text-right">{selectedShipment?.sender.address}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-blue-700">Phone:</span>
                                    <span className="font-medium text-blue-900">{selectedShipment?.sender.phone}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Recipient Info */}
                              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                                <h4 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">R</span>
                                  Recipient Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-emerald-700">Name:</span>
                                    <span className="font-medium text-emerald-900">{selectedShipment?.recipient.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-emerald-700">Address:</span>
                                    <span className="font-medium text-emerald-900 text-right">{selectedShipment?.recipient.address}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-emerald-700">Phone:</span>
                                    <span className="font-medium text-emerald-900">{selectedShipment?.recipient.phone}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Package & Branch Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                  <h4 className="font-semibold text-slate-900 mb-3 text-sm">Package Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-slate-600 block text-xs mb-1">Weight</span>
                                      <span className="font-semibold text-slate-900">{selectedShipment?.packageInfo.weight} kg</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-600 block text-xs mb-1">Type</span>
                                      <span className="font-semibold text-slate-900">{selectedShipment?.packageInfo.type}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                  <h4 className="font-semibold text-slate-900 mb-3 text-sm">Branch Info</h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-slate-600 block text-xs mb-1">Origin Branch</span>
                                      <span className="font-semibold text-slate-900">{selectedShipment?.originBranch?.name}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-600 block text-xs mb-1">Destination Branch</span>
                                      <span className="font-semibold text-slate-900">{selectedShipment?.destinationBranch?.name || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Status History Timeline */}
                              {selectedShipment?.statusHistory && selectedShipment.statusHistory.length > 0 && (
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold text-slate-900 mb-4">Status History</h4>
                                  <div className="relative space-y-4">
                                    {selectedShipment.statusHistory.map((history: any, index: number) => (
                                      <div key={index} className="flex gap-4">
                                        {/* Timeline dot and line */}
                                        <div className="flex flex-col items-center">
                                          <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100 z-10"></div>
                                          {index !== (selectedShipment?.statusHistory?.length ?? 0) - 1 && (
                                            <div className="w-1 h-12 bg-gradient-to-b from-blue-300 to-blue-100 mt-2"></div>
                                          )}
                                        </div>
                                        {/* Timeline content */}
                                        <div className="flex-1 pb-2">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-semibold text-slate-900">{history.status}</p>
                                              <p className="text-xs text-slate-500 mt-1">
                                                {new Date(history.timestamp).toLocaleString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </p>
                                            </div>
                                          </div>
                                          {history.notes && (
                                            <p className="text-xs text-slate-600 mt-2 italic bg-slate-100 p-2 rounded">
                                              "{history.notes}"
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={isUpdateDialogOpen && selectedShipment?._id === shipment._id}
                          onOpenChange={setIsUpdateDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                openModal("update", shipment)
                                setIsUpdateDialogOpen(true)
                                setUpdateStatus(shipment.status)
                              }}
                              className="h-8 w-8"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Update Shipment</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleUpdateShipment} className="space-y-4">
                              <div>
                                <Label className="text-slate-700 font-medium mb-1.5">Status</Label>
                                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                                  <SelectTrigger className="h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="At Origin Branch">At Origin</SelectItem>
                                    <SelectItem value="In Transit">In Transit</SelectItem>
                                    <SelectItem value="At Destination Branch">At Destination</SelectItem>
                                    <SelectItem value="Assigned">Assigned</SelectItem>
                                    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                    <SelectItem value="Failed">Failed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-slate-700 font-medium mb-1.5">Assign Staff</Label>
                                <Select value={updateAssignedTo} onValueChange={setUpdateAssignedTo}>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select staff" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">None</SelectItem>
                                    {drivers.map((driver) => (
                                      <SelectItem key={driver._id} value={driver._id}>
                                        {driver.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="notes" className="text-slate-700 font-medium mb-1.5">
                                  Notes
                                </Label>
                                <Input
                                  id="notes"
                                  value={updateNotes}
                                  onChange={(e) => setUpdateNotes(e.target.value)}
                                  placeholder="Optional notes..."
                                  className="h-10"
                                />
                              </div>
                              <DialogFooter className="mt-6">
                                <Button variant="outline" type="button" onClick={() => setIsUpdateDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                  {isSubmitting ? "Updating..." : "Update"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={isDeleteDialogOpen && selectedShipment?._id === shipment._id}
                          onOpenChange={setIsDeleteDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                openModal("delete", shipment)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="h-8 w-8"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Delete Shipment?</DialogTitle>
                              <DialogDescription>
                                This will permanently delete shipment {selectedShipment?.trackingId}. This cannot be
                                undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleDeleteShipment} disabled={isSubmitting}>
                                {isSubmitting ? "Deleting..." : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
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
    </div>
  )
}
