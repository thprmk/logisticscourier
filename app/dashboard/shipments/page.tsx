// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Eye, Search, ChevronDown, Building, Package as PackageIcon, X, Filter, CheckSquare, Square } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils"; // This is a helper from shadcn
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


// At the top with your other imports
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";


// Define TypeScript interfaces for our data
interface IAddress {
  name: string;
  address: string;
  phone: string;
}

interface IBranch {
  _id: string;
  name: string;
}

interface IStatusHistory {
  status: string;
  timestamp: Date;
  notes?: string;
}

interface IShipment {
  _id: string;
  trackingId: string;
  sender: IAddress;
  recipient: IAddress;
  status: 'At Origin Branch' | 'In Transit to Destination' | 'At Destination Branch' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed';
  assignedTo?: {
    _id: string;
    name: string;
  }
  statusHistory: IStatusHistory[];
  createdAt: string;
  packageInfo: {
    weight: number;
    type: string;
  };
  deliveryProof?: {
    type: 'signature' | 'photo';
    url: string;  // Vercel Blob URL
  };
  failureReason?: string;
}

interface IUser {
  _id: string;
  name: string;
}

// Define the type for our modals for cleaner state management
type ModalType = 'create' | 'update' | 'delete' | 'view' | null;

export default function ShipmentsPage() {
  const { user } = useUser();
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [drivers, setDrivers] = useState<IUser[]>([]);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refined state management from the blueprint

  const [selectedShipment, setSelectedShipment] = useState<IShipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for form fields
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageWeight, setPackageWeight] = useState(1);
  const [packageType, setPackageType] = useState('Parcel');
  const [assignedStaff, setAssignedStaff] = useState(''); // New state for staff assignment
  const [originBranchId, setOriginBranchId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); 
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // State for the update form
  const [updateStatus, setUpdateStatus] = useState<IShipment['status']>('At Origin Branch');
  const [updateAssignedTo, setUpdateAssignedTo] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [bulkAssignStaff, setBulkAssignStaff] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const isLocalDelivery = destinationBranchId && destinationBranchId === originBranchId;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch shipments, drivers, and branches in parallel
      const [shipmentsRes, driversRes, branchesRes] = await Promise.all([
        fetch('/api/shipments', { credentials: 'include' }),
        fetch('/api/users?role=staff', { credentials: 'include' }), // Assuming 'staff' are drivers
        fetch('/api/tenants', { credentials: 'include' })
      ]);

      if (!shipmentsRes.ok) throw new Error('Failed to fetch shipments');
      if (!driversRes.ok) throw new Error('Failed to fetch drivers');
      if (!branchesRes.ok) throw new Error('Failed to fetch branches');

      const shipmentsData = await shipmentsRes.json();
      const driversData = await driversRes.json();
      const branchesData = await branchesRes.json();

      setShipments(shipmentsData);
      setDrivers(driversData);
      setBranches(branchesData);

      // Set origin branch to current user's branch
      if (user?.tenantId && !originBranchId) {
        setOriginBranchId(user.tenantId);
      }

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('shipmentFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchQuery(filters.searchQuery || '');
        setStatusFilter(filters.statusFilter || '');
        setFilterAssignedTo(filters.filterAssignedTo || '');
        setFilterStartDate(filters.filterStartDate || '');
        setFilterEndDate(filters.filterEndDate || '');
      } catch (error) {
        console.error('Failed to parse saved filters:', error);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters = {
      searchQuery,
      statusFilter,
      filterAssignedTo,
      filterStartDate,
      filterEndDate
    };
    localStorage.setItem('shipmentFilters', JSON.stringify(filters));
  }, [searchQuery, statusFilter, filterAssignedTo, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchData();
  }, []);


  const filteredShipments = useMemo(() => {
    let filtered = shipments;

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(shipment => shipment.status === statusFilter);
    }

    // Apply assigned staff filter
    if (filterAssignedTo) {
      filtered = filtered.filter(shipment => shipment.assignedTo?._id === filterAssignedTo);
    }

    // Apply date range filter
    if (filterStartDate) {
      const startDate = new Date(filterStartDate);
      filtered = filtered.filter(shipment => new Date(shipment.createdAt) >= startDate);
    }
    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(shipment => new Date(shipment.createdAt) <= endDate);
    }

    // Apply search query
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(shipment =>
        shipment.trackingId.toLowerCase().includes(lowercasedQuery) ||
        shipment.recipient.name.toLowerCase().includes(lowercasedQuery) ||
        shipment.recipient.phone.includes(lowercasedQuery)
      );
    }

    return filtered;
  }, [shipments, searchQuery, statusFilter, filterAssignedTo, filterStartDate, filterEndDate]);

  // Pagination logic
  const totalPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, filterAssignedTo, filterStartDate, filterEndDate]);

  const resetForms = () => {
    setSenderName(''); setSenderAddress(''); setSenderPhone('');
    setRecipientName(''); setRecipientAddress(''); setRecipientPhone('');
    setPackageWeight(1); setPackageType('Parcel');
    setAssignedStaff(''); // Reset assigned staff
    setDestinationBranchId(''); // Reset destination, but keep origin
    setOriginBranchId(user?.tenantId || '');
    setUpdateStatus('At Origin Branch'); setUpdateAssignedTo(''); setUpdateNotes('');
    setSelectedShipment(null);
  };

  const toggleSelectShipment = (shipmentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId);
    } else {
      newSelected.add(shipmentId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredShipments.length && filteredShipments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredShipments.map(s => s._id)));
    }
  };

  // Validate which actions are valid for selected shipments
  const canAssignToStaff = useMemo(() => {
    if (selectedIds.size === 0) return false;
    const selectedShipments = shipments.filter(s => selectedIds.has(s._id));
    // Only "At Destination Branch" status allows staff assignment
    return selectedShipments.every(s => s.status === 'At Destination Branch');
  }, [selectedIds, shipments]);

  const getAssignmentDisabledReason = useMemo(() => {
    if (selectedIds.size === 0) return '';
    const selectedShipments = shipments.filter(s => selectedIds.has(s._id));

    const invalidStatuses = new Set<string>();
    selectedShipments.forEach(s => {
      if (s.status !== 'At Destination Branch') {
        invalidStatuses.add(s.status);
      }
    });

    if (invalidStatuses.size > 0) {
      const statusList = Array.from(invalidStatuses).join(', ');
      return `You can only assign shipments that are at the destination branch. Selected has: ${statusList}`;
    }
    return '';
  }, [selectedIds, shipments]);

  const handleBulkAssign = async () => {
    if (!canAssignToStaff) {
      toast.error(getAssignmentDisabledReason || 'Cannot assign these shipments');
      return;
    }
    if (!bulkAssignStaff) {
      toast.error('Please select a staff member');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Assigning ${selectedIds.size} shipments...`);

    try {
      const shipmentIds = Array.from(selectedIds);
      const results = await Promise.all(
        shipmentIds.map(id =>
          fetch(`/api/shipments/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedTo: bulkAssignStaff })
          })
        )
      );

      const allSuccess = results.every(r => r.ok);
      if (!allSuccess) throw new Error('Some assignments failed');

      toast.success(`Successfully assigned ${shipmentIds.length} shipments`, { id: toastId });
      setSelectedIds(new Set());
      setBulkAssignStaff('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign shipments', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one shipment');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} shipment(s)? This cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Deleting ${selectedIds.size} shipments...`);

    try {
      const shipmentIds = Array.from(selectedIds);
      const results = await Promise.all(
        shipmentIds.map(id =>
          fetch(`/api/shipments/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        )
      );

      const allSuccess = results.every(r => r.ok);
      if (!allSuccess) throw new Error('Some deletions failed');

      toast.success(`Successfully deleted ${shipmentIds.length} shipments`, { id: toastId });
      setSelectedIds(new Set());
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shipments', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFiltersAndState = () => {
    setSearchQuery('');
    setStatusFilter('');
    setFilterAssignedTo('');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(1);
    localStorage.removeItem('shipmentFilters');
  };

  // Modal management
  const [modalType, setModalType] = useState<ModalType>(null);

  const openModal = (type: ModalType, shipment?: IShipment) => {
    setModalType(type);
    if (shipment) setSelectedShipment(shipment);
  };

  const closeModal = () => {
    setModalType(null);
    resetForms();
      setIsUpdateDialogOpen(false);
  setIsDeleteDialogOpen(false);
  setIsViewDialogOpen(false);
  };

  //CRUD Handlers 

  const handleCreateShipment = async (event: FormEvent) => {
    event.preventDefault();

    // Validation
    if (!originBranchId) {
      toast.error('Origin branch is required');
      return;
    }
    if (!destinationBranchId) {
      toast.error('Please select a destination branch');
      return;
    }
    if (!senderName || !senderAddress || !senderPhone) {
      toast.error('Please fill in all sender details');
      return;
    }
    if (!recipientName || !recipientAddress || !recipientPhone) {
      toast.error('Please fill in all recipient details');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Creating new shipment...');

    const newShipmentData = {
      sender: { name: senderName, address: senderAddress, phone: senderPhone },
      recipient: { name: recipientName, address: recipientAddress, phone: recipientPhone },
      packageInfo: { weight: packageWeight, type: packageType },
      originBranchId: originBranchId,
      destinationBranchId: destinationBranchId,
      assignedTo: assignedStaff || undefined // Include assigned staff if selected
    };

    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShipmentData)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create shipment");
      }
      toast.success('Shipment created successfully', { id: toastId });
      setIsCreateDialogOpen(false);
      fetchData(); // Refresh all data
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shipment', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShipment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedShipment) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Updating shipment ${selectedShipment.trackingId}...`);

    // If we're assigning a driver, the update is handled by the API endpoint
    // The API will automatically transition to 'Assigned' status
    let statusToUpdate = updateStatus;

    const updatePayload = {
      status: statusToUpdate,
      assignedTo: updateAssignedTo || null,
      notes: updateNotes
    };

    try {
      const res = await fetch(`/api/shipments/${selectedShipment._id}`, {
        method: 'PATCH', // Use PATCH for partial updates
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message); }

      // Show specific status update message based on the status
      let statusMessage = '';
      switch (statusToUpdate) {
        case 'Delivered':
          statusMessage = 'Status updated to Delivered';
          break;
        case 'Out for Delivery':
          statusMessage = 'Status updated to Out for Delivery';
          break;
        case 'Assigned':
          statusMessage = 'Status updated to Assigned';
          break;
        default:
          statusMessage = `Status updated to ${statusToUpdate}`;
      }

      toast.success(statusMessage, { id: toastId });
      setIsUpdateDialogOpen(false); 
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update shipment', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShipment = async () => {
    if (!selectedShipment) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Deleting shipment ${selectedShipment.trackingId}...`);
    try {
      const res = await fetch(`/api/shipments/${selectedShipment._id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
      toast.success(`Shipment ${selectedShipment.trackingId} deleted successfully`, { id: toastId });
      setIsDeleteDialogOpen(false); 
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shipment', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render status badges

const StatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  
  if (status === 'Delivered') {
    // You can customize this further if you define a "success" variant
    variant = "secondary"; 
  } else if (status === 'Failed') {
    variant = "destructive";
  }

  return (
    <Badge variant={variant}>{status}</Badge>
  );
};
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipment Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Create, track, and manage all shipments for your branch.</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForms}>
              <Plus size={18} className="mr-2" />
              Add New Shipment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <form onSubmit={handleCreateShipment}>
              <DialogHeader>
                <DialogTitle>Create New Shipment</DialogTitle>
                <DialogDescription>
                  Enter sender, recipient, and package details below.
                </DialogDescription>
              </DialogHeader>

              {/* Form Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                {/* Sender Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Sender Details</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="sender-name">Full Name</Label>
                    <Input id="sender-name" value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sender-address">Full Address</Label>
                    <Input id="sender-address" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sender-phone">Phone Number</Label>
                    <Input id="sender-phone" type="tel" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} required />
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Recipient Details</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="recipient-name">Full Name</Label>
                    <Input id="recipient-name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recipient-address">Full Address</Label>
                    <Input id="recipient-address" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recipient-phone">Phone Number</Label>
                    <Input id="recipient-phone" type="tel" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} required />
                  </div>
                </div>

                {/* Branch Details */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold text-foreground">Branch Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Origin Branch (Current)</Label>
                      <Input value={branches.find(b => b._id === originBranchId)?.name || ''} disabled />
                    </div>
                    <div className="grid gap-2">
                      <Label>Destination Branch</Label>
                      <Select value={destinationBranchId} onValueChange={setDestinationBranchId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch._id} value={branch._id}>{branch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Delivery Type Message */}
                  {destinationBranchId && (
                    <div className={`p-4 rounded-lg text-sm font-medium ${
                      isLocalDelivery 
                        ? 'bg-green-50 text-green-900 border border-green-200' 
                        : 'bg-blue-50 text-blue-900 border border-blue-200'
                    }`}>
                      {isLocalDelivery ? (
                        <>
                          <span className="font-semibold">✓ Local Delivery:</span> This package stays in {branches.find(b => b._id === originBranchId)?.name}. It can be immediately assigned to a delivery staff member.
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">→ Inter-Branch Transfer:</span> This package will be sent to {branches.find(b => b._id === destinationBranchId)?.name}. It will require a manifest dispatch.
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Package Details */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold text-foreground">Package Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Weight (kg)</Label>
                      <Input type="number" value={packageWeight} onChange={(e) => setPackageWeight(parseFloat(e.target.value))} required />
                    </div>
                    <div className="grid gap-2">
                      <Label>Package Type</Label>
                      <Select value={packageType} onValueChange={setPackageType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Parcel">Parcel</SelectItem>
                          <SelectItem value="Document">Document</SelectItem>
                          <SelectItem value="Fragile">Fragile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Assign Staff {!isLocalDelivery && <span className="text-xs text-gray-500">(Inter-branch only)</span>}</Label>
            
<Select
  value={assignedStaff}
  onValueChange={(value) => setAssignedStaff(value === "none" ? "" : value)} // Smart handler
  disabled={!isLocalDelivery}
>
    <SelectTrigger>
        <SelectValue placeholder="-- None --" />
    </SelectTrigger>
    <SelectContent>
        {/* The fix is here: value is now "none" */}
        <SelectItem value="none">-- None --</SelectItem> 
        {drivers.map(driver => (
            <SelectItem key={driver._id} value={driver._id}>{driver.name}</SelectItem>
        ))}
    </SelectContent>
</Select>
                      {!isLocalDelivery && destinationBranchId && (
                        <p className="text-xs text-gray-500 mt-1">Staff assignment is only available for local deliveries (same origin and destination branch)</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Create Shipment'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters Section */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              {/* Search Bar - Left Side */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
     
            <Input
              type="text"
              placeholder="Search tracking, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10" // We only need to adjust padding, shadcn handles the rest
            />
              </div>

              {/* Filter Controls - Right Side */}
              <div className="flex flex-wrap lg:flex-nowrap items-end gap-2 lg:justify-end">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="At Origin Branch">At Origin</SelectItem>
                    <SelectItem value="In Transit to Destination">In Transit</SelectItem>
                    <SelectItem value="At Destination Branch">At Destination</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterAssignedTo} onValueChange={(value) => setFilterAssignedTo(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver._id} value={driver._id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Range - Single Control */}
                <div className="flex-1 sm:flex-initial sm:w-auto">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full sm:w-[260px] justify-start text-left font-normal",
                          !filterStartDate && !filterEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterStartDate && filterEndDate ? (
                          <>
                            {format(new Date(filterStartDate), "LLL dd, y")} -{" "}
                            {format(new Date(filterEndDate), "LLL dd, y")}
                          </>
                        ) : filterStartDate ? (
                          format(new Date(filterStartDate), "LLL dd, y")
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={filterStartDate ? new Date(filterStartDate) : new Date()}
                        selected={{
                          from: filterStartDate ? new Date(filterStartDate) : undefined,
                          to: filterEndDate ? new Date(filterEndDate) : undefined,
                        }}
                        onSelect={(range) => {
                          setFilterStartDate(range?.from ? format(range.from, "yyyy-MM-dd") : "");
                          setFilterEndDate(range?.to ? format(range.to, "yyyy-MM-dd") : "");
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button variant="destructive" onClick={clearFiltersAndState}>
                  Clear
                </Button>
              </div>
            </div>

            {/* Bulk Actions Bar - Only shows when shipments selected */}
            {selectedIds.size > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-50 to-blue-100/50 p-5 rounded-xl border border-blue-200 shadow-sm transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white">
                    <CheckSquare size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedIds.size} selected</p>
                    <p className="text-xs text-gray-500 mt-0.5">Choose an action below</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
          

                <div className="flex-1 sm:flex-none min-w-[200px]">
  <Select
    value={bulkAssignStaff}
    onValueChange={(value) => setBulkAssignStaff(value === "none" ? "" : value)} // Smart handler
    disabled={!canAssignToStaff}
  >
    <SelectTrigger className="h-11">
      <SelectValue placeholder="Select Staff Member" />
    </SelectTrigger>
    <SelectContent>
      {/* The fix is here: value is now "none" */}
      <SelectItem value="none">Select Staff Member</SelectItem> 
      {drivers.map((driver) => (
        <SelectItem key={driver._id} value={driver._id}>
          {driver.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

           <div className="relative group">

                    <Button
                      onClick={handleBulkAssign}
                      disabled={!canAssignToStaff || !bulkAssignStaff || isSubmitting}
                    >
                      {isSubmitting ? 'Assigning...' : 'Assign to Staff'}
                    </Button>

                    {!canAssignToStaff && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                        {getAssignmentDisabledReason}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleBulkDelete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Selected'}
                  </Button>
                  <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Advanced Filters Panel - Removed (now integrated above) */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSelectAll}
                        title={selectedIds.size === filteredShipments.length ? 'Deselect All' : 'Select All'}
                      >
                        {selectedIds.size === filteredShipments.length && filteredShipments.length > 0 ? (
                          <CheckSquare size={20} className="text-primary" />
                        ) : (
                          <Square size={20} className="text-muted-foreground" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[80px]">S/No</TableHead>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Loading shipments...
                      </TableCell>
                    </TableRow>
                  ) : paginatedShipments.length > 0 ? (
                    paginatedShipments.map((shipment, index) => (
                      <TableRow
                        key={shipment._id}
                        data-state={selectedIds.has(shipment._id) && "selected"}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSelectShipment(shipment._id)}
                          >
                            {selectedIds.has(shipment._id) ? (
                              <CheckSquare size={20} className="text-primary" />
                            ) : (
                              <Square size={20} className="text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                        <TableCell className="font-mono">{shipment.trackingId}</TableCell>
                        <TableCell>
                          <div className="font-medium">{shipment.recipient.name}</div>
                          <div className="text-muted-foreground text-sm">{shipment.recipient.address}</div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={shipment.status} />
                        </TableCell>
                        <TableCell>
                          {shipment.assignedTo?.name || (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* We can use icon buttons for a cleaner look */}
                          

                          <Dialog open={isViewDialogOpen && selectedShipment?._id === shipment._id} onOpenChange={setIsViewDialogOpen}>
  <DialogTrigger asChild>
    <Button variant="ghost" size="icon" onClick={() => {
      // We'll use the 'view' type in openModal to trigger a fresh data fetch
      openModal('view', shipment); 
      setIsViewDialogOpen(true);
    }} title="View Details">
      <Eye size={18} />
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-3xl">
    <DialogHeader>
      <DialogTitle>Shipment Details</DialogTitle>
      <DialogDescription>
        Tracking ID: <span className="font-mono">{selectedShipment?.trackingId}</span>
      </DialogDescription>
    </DialogHeader>

    {/* Display Content */}
    <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
      {/* Sender & Recipient */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Sender</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><span className="font-medium text-foreground">Name:</span> {selectedShipment?.sender.name}</p>
            <p><span className="font-medium text-foreground">Address:</span> {selectedShipment?.sender.address}</p>
            <p><span className="font-medium text-foreground">Phone:</span> {selectedShipment?.sender.phone}</p>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Recipient</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            <p><span className="font-medium text-foreground">Name:</span> {selectedShipment?.recipient.name}</p>
            <p><span className="font-medium text-foreground">Address:</span> {selectedShipment?.recipient.address}</p>
            <p><span className="font-medium text-foreground">Phone:</span> {selectedShipment?.recipient.phone}</p>
          </div>
        </div>
      </div>
      
      {/* Package Info */}
      <div>
        <h3 className="font-semibold mb-2">Package Information</h3>
        <div className="grid grid-cols-3 gap-4">
            {/* ... Your existing package info display logic can go here ... */}
        </div>
      </div>

      {/* Status History */}
      <div>
        <h3 className="font-semibold mb-2">Status History</h3>
        <div className="space-y-4">
          {selectedShipment?.statusHistory?.map((history, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                {index !== selectedShipment.statusHistory.length - 1 && (
                  <div className="w-0.5 grow bg-border mt-1"></div>
                )}
              </div>
              <div>
                <p className="font-semibold">{history.status}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(history.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
       {/* Delivery Proof Section can be copied from your old modal */}

    </div>
    
    <DialogFooter>
      <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>



                        <Dialog open={isUpdateDialogOpen && selectedShipment?._id === shipment._id} onOpenChange={setIsUpdateDialogOpen}>
  <DialogTrigger asChild>
    <Button variant="ghost" size="icon" onClick={() => {
      // This logic now runs when the user clicks the Edit icon.
      // It prepares the form state BEFORE the modal opens.
      setSelectedShipment(shipment);
      setUpdateStatus(shipment.status);
      setUpdateAssignedTo(shipment.assignedTo?._id || '');
      setUpdateNotes('');
    }} title="Update Status/Assign">
      <Edit size={18} />
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <form onSubmit={handleUpdateShipment}>
      <DialogHeader>
        <DialogTitle>Update Shipment</DialogTitle>
        <DialogDescription>
          Make changes to the shipment. Click save when you're done.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="status" className="text-right">
            Status
          </Label>
          <div className="col-span-3">
            <Select value={updateStatus} onValueChange={(value) => setUpdateStatus(value as IShipment['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="At Destination Branch">At Destination Branch</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="driver" className="text-right">
            Assign Driver
          </Label>
          <div className="col-span-3">
            <Select value={updateAssignedTo} onValueChange={setUpdateAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="-- Unassigned --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Unassigned --</SelectItem>
                {drivers.map(driver => (
                  <SelectItem key={driver._id} value={driver._id}>{driver.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="notes" className="text-right">
            Notes
          </Label>
          <Input 
            id="notes" 
            value={updateNotes} 
            onChange={(e) => setUpdateNotes(e.target.value)} 
            className="col-span-3" 
            placeholder="Optional notes for status history"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={() => setIsUpdateDialogOpen(false)}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
                        <Dialog open={isDeleteDialogOpen && selectedShipment?._id === shipment._id} onOpenChange={setIsDeleteDialogOpen}>
  <DialogTrigger asChild>
    <Button variant="ghost" size="icon" onClick={() => setSelectedShipment(shipment)} title="Cancel Shipment">
      <Trash2 size={18} className="text-destructive" />
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Cancel Shipment</DialogTitle>
      <DialogDescription>
        Are you sure you want to cancel shipment <span className="font-semibold">{shipment.trackingId}</span>? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="sm:justify-start">
      <Button type="button" variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
        No, Keep It
      </Button>
      <Button type="button" variant="destructive" onClick={handleDeleteShipment} disabled={isSubmitting}>
        {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Shipment'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No shipments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination Controls - This code can remain largely the same, but let's wrap it for styling */}
              {filteredShipments.length > 0 && (
                <div className="flex items-center justify-between gap-4 px-6 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    {selectedIds.size} of {filteredShipments.length} row(s) selected.
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Your existing pagination buttons will work well here */}
                    {/* Example for Previous button using Shadcn */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {/* Shipments Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                  <p className="text-sm text-gray-600">Loading shipments...</p>
                </div>
              ) : paginatedShipments.length > 0 ? (
                paginatedShipments.map((shipment, index) => (
                  <div key={shipment._id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">#{startIndex + index + 1}</span>
                          <span className="text-xs font-mono text-blue-600 font-semibold">{shipment.trackingId}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">{shipment.recipient.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{shipment.recipient.address}</p>
                      </div>
                      <StatusBadge status={shipment.status} />
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-0.5">Assigned To</span>
                        <span className="text-gray-900 font-medium">
                          {shipment.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Date</span>
                        <span className="text-gray-900 font-medium">
                          {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openModal('view', shipment)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={() => openModal('update', shipment)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                      >
                        <Edit size={14} />
                        Update
                      </button>
                      <button
                        onClick={() => openModal('delete', shipment)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
                  <PackageIcon className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1">No shipments found</h3>
                  <p className="text-sm text-gray-500 text-center px-4">
                    {shipments.length > 0
                      ? "No shipments match your filters."
                      : "No shipments have been created yet."}
                  </p>
                  {shipments.length === 0 && (
                    <button
                      onClick={() => openModal('create')}
                      className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create your first shipment
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          );
}