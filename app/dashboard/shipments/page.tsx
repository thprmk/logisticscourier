// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Search, Building, Package as PackageIcon, Loader, Users } from 'lucide-react';
import { sanitizeInput, isValidEmail, isValidPhone, isValidAddress } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

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

  createdBy?: {
    _id: string;
    name: string;
  };

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
  const [admins, setAdmins] = useState<IUser[]>([]);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refined state management from the blueprint
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedShipment, setSelectedShipment] = useState<IShipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);

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

  // State for the update form
  const [updateStatus, setUpdateStatus] = useState<IShipment['status']>('At Origin Branch');
  const [updateAssignedTo, setUpdateAssignedTo] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');

  // Bulk actions state
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set());
  const [bulkAssignDriver, setBulkAssignDriver] = useState('');
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isLocalDelivery = destinationBranchId && destinationBranchId === originBranchId;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // ... existing code ...
      const [shipmentsRes, driversRes, adminsRes, branchesRes] = await Promise.all([
        fetch('/api/shipments', { credentials: 'include' }),
        fetch('/api/users?role=staff', { credentials: 'include' }),
        fetch('/api/users?role=admin', { credentials: 'include' }),
        fetch('/api/tenants', { credentials: 'include' })
      ]);

      if (!shipmentsRes.ok) throw new Error('Failed to fetch shipments');
      if (!driversRes.ok) throw new Error('Failed to fetch drivers');
      if (!adminsRes.ok) throw new Error('Failed to fetch admins');
      if (!branchesRes.ok) throw new Error('Failed to fetch branches');

      const shipmentsData = await shipmentsRes.json();
      const driversData = await driversRes.json();
      const adminsData = await adminsRes.json();
      const branchesData = await branchesRes.json();

      setShipments(shipmentsData);
      setDrivers(driversData);
      setAdmins(adminsData);
      setBranches(branchesData);

    } catch (err: any) {
      console.error('Fetch error:', err);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);


  const filteredShipments = useMemo(() => {
    let filtered = shipments;

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(shipment => shipment.status === statusFilter);
    }

    // Apply assigned to filter
    if (assignedToFilter) {
      filtered = filtered.filter(shipment => shipment.assignedTo?._id === assignedToFilter);
    }

    // Apply created by filter
    if (createdByFilter) {
      filtered = filtered.filter(shipment => shipment.createdBy?._id === createdByFilter);
    }

    // Apply date range filter
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      filtered = filtered.filter(shipment => new Date(shipment.createdAt) >= startDate);
    }
    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
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
  }, [shipments, searchQuery, statusFilter, assignedToFilter, createdByFilter, dateRangeStart, dateRangeEnd]);

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

  // Check if user can edit/delete this shipment (only creator can)
  const canEditShipment = (shipment: IShipment): boolean => {
    return user?.id === shipment.createdBy?._id;
  };

  const openModal = (type: ModalType, shipment?: IShipment) => {
    // Check permissions before opening edit/delete modals
    if ((type === 'update' || type === 'delete') && shipment && !canEditShipment(shipment)) {
      toast.error('You can only edit/delete shipments you created');
      return;
    }
    
    resetForms();
    setModalType(type);
    if (shipment) {
      setSelectedShipment(shipment);
      // Pre-fill update form
      if (type === 'update') {
        setUpdateStatus(shipment.status);
        setUpdateAssignedTo(shipment.assignedTo?._id || '');
      }
      // If viewing, fetch fresh data to ensure we have all fields including deliveryProof
      if (type === 'view') {
        const fetchShipmentDetails = async () => {
          try {
            const res = await fetch(`/api/shipments/${shipment._id}`, { credentials: 'include' });
            if (res.ok) {
              const freshData = await res.json();
              setSelectedShipment(freshData);
            }
          } catch (error) {
            console.error('Error fetching shipment details:', error);
          }
        };
        fetchShipmentDetails();
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    resetForms();
  };

  //CRUD Handlers 

  const handleCreateShipment = async (event: FormEvent) => {
    event.preventDefault();
    
    // Sanitize and validate inputs
    const sanitizedSenderName = sanitizeInput(senderName);
    const sanitizedSenderAddress = sanitizeInput(senderAddress);
    const sanitizedSenderPhone = senderPhone.trim();
    const sanitizedRecipientName = sanitizeInput(recipientName);
    const sanitizedRecipientAddress = sanitizeInput(recipientAddress);
    const sanitizedRecipientPhone = recipientPhone.trim();
    
    // Validation
    if (!originBranchId) {
      toast.error('Origin branch is required');
      return;
    }
    if (!destinationBranchId) {
      toast.error('Please select a destination branch');
      return;
    }
    if (!sanitizedSenderName || !sanitizedSenderAddress || !sanitizedSenderPhone) {
      toast.error('Please fill in all sender details');
      return;
    }
    if (!isValidAddress(sanitizedSenderAddress)) {
      toast.error('Sender address must be between 5-200 characters');
      return;
    }
    if (!isValidPhone(sanitizedSenderPhone)) {
      toast.error('Invalid sender phone number');
      return;
    }
    if (!sanitizedRecipientName || !sanitizedRecipientAddress || !sanitizedRecipientPhone) {
      toast.error('Please fill in all recipient details');
      return;
    }
    if (!isValidAddress(sanitizedRecipientAddress)) {
      toast.error('Recipient address must be between 5-200 characters');
      return;
    }
    if (!isValidPhone(sanitizedRecipientPhone)) {
      toast.error('Invalid recipient phone number');
      return;
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading('Creating new shipment...');

    const newShipmentData = {
        sender: { name: sanitizedSenderName, address: sanitizedSenderAddress, phone: sanitizedSenderPhone },
        recipient: { name: sanitizedRecipientName, address: sanitizedRecipientAddress, phone: sanitizedRecipientPhone },
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
        closeModal();
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
        closeModal();
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
        closeModal();
        fetchData();
    } catch (error: any) {
        toast.error(error.message || 'Failed to delete shipment', { id: toastId });
    } finally { 
        setIsSubmitting(false);
    }
  };
  
  // Helper to render status badges
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: { [key: string]: string } = {
        'At Origin Branch': 'bg-purple-100 text-purple-800',
        'In Transit to Destination': 'bg-indigo-100 text-indigo-800',
        'At Destination Branch': 'bg-blue-100 text-blue-800',
        'Assigned': 'bg-cyan-100 text-cyan-800',
        'Out for Delivery': 'bg-orange-100 text-orange-800',
        'Delivered': 'bg-green-100 text-green-800',
        'Failed': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
  };
  
  // Bulk actions handlers
  const handleSelectShipment = (shipmentId: string) => {
    const newSelected = new Set(selectedShipmentIds);
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId);
    } else {
      newSelected.add(shipmentId);
    }
    setSelectedShipmentIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedShipmentIds.size === filteredShipments.length) {
      setSelectedShipmentIds(new Set());
    } else {
      const allIds = new Set(filteredShipments.map(s => s._id));
      setSelectedShipmentIds(allIds);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedShipmentIds.size === 0) {
      toast.error('Please select at least one shipment');
      return;
    }
    if (!bulkAssignDriver) {
      toast.error('Please select a driver');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Assigning ${selectedShipmentIds.size} shipments...`);

    try {
      const updatePromises = Array.from(selectedShipmentIds).map(shipmentId =>
        fetch(`/api/shipments/${shipmentId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTo: bulkAssignDriver })
        })
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every(res => res.ok);

      if (!allOk) throw new Error('Some assignments failed');

      toast.success(`Successfully assigned ${selectedShipmentIds.size} shipments`, { id: toastId });
      setSelectedShipmentIds(new Set());
      setBulkAssignDriver('');
      setShowBulkAssignModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign shipments', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedShipmentIds.size === 0) {
      toast.error('Please select at least one shipment');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Deleting ${selectedShipmentIds.size} shipments...`);

    try {
      const deletePromises = Array.from(selectedShipmentIds).map(shipmentId =>
        fetch(`/api/shipments/${shipmentId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      );

      const responses = await Promise.all(deletePromises);
      const allOk = responses.every(res => res.ok);

      if (!allOk) throw new Error('Some deletions failed');

      toast.success(`Successfully deleted ${selectedShipmentIds.size} shipments`, { id: toastId });
      setSelectedShipmentIds(new Set());
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shipments', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... existing code ...

  const clearAllFilters = () => {
    setStatusFilter('');
    setAssignedToFilter('');
    setCreatedByFilter('');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, assignedToFilter, createdByFilter, dateRangeStart, dateRangeEnd, searchQuery]);
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipment Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Create, track, and manage all shipments for your branch.</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and Button */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="filter-status" className="text-xs block mb-1">Status</Label>
              <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="filter-status" className="h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="At Origin Branch">At Origin Branch</SelectItem>
                  <SelectItem value="In Transit to Destination">In Transit</SelectItem>
                  <SelectItem value="At Destination Branch">At Destination Branch</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To Filter */}
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="filter-assigned" className="text-xs block mb-1">Assigned Staff</Label>
              <Select value={assignedToFilter || 'all'} onValueChange={(val) => setAssignedToFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="filter-assigned" className="h-9 text-sm">
                  <SelectValue placeholder="All Staff" />
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
            </div>

            {/* Created By Filter */}
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="filter-created" className="text-xs block mb-1">Created By</Label>
              <Select value={createdByFilter || 'all'} onValueChange={(val) => setCreatedByFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="filter-created" className="h-9 text-sm">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {admins.map(admin => (
                    <SelectItem key={admin._id} value={admin._id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs block mb-1">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-start text-sm font-normal"
                  >
                    {dateRangeStart && dateRangeEnd
                      ? `${format(new Date(dateRangeStart), 'MMM dd')} - ${format(new Date(dateRangeEnd), 'MMM dd')}`
                      : dateRangeStart
                      ? `${format(new Date(dateRangeStart), 'MMM dd')} - Pick end`
                      : 'Pick date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-0">
                    <div className="p-3">
                      <Label className="text-xs mb-2 block">Start Date</Label>
                      <Calendar
                        mode="single"
                        selected={dateRangeStart ? new Date(dateRangeStart) : undefined}
                        onSelect={(date) => setDateRangeStart(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) =>
                          dateRangeEnd ? date > new Date(dateRangeEnd) : false
                        }
                      />
                    </div>
                    <div className="p-3">
                      <Label className="text-xs mb-2 block">End Date</Label>
                      <Calendar
                        mode="single"
                        selected={dateRangeEnd ? new Date(dateRangeEnd) : undefined}
                        onSelect={(date) => setDateRangeEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) =>
                          dateRangeStart ? date < new Date(dateRangeStart) : false
                        }
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}

            {/* Clear and Add Buttons */}
            <div className="flex items-end gap-2">
              {(statusFilter || assignedToFilter || createdByFilter || dateRangeStart || dateRangeEnd) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllFilters}
                  className="h-9 text-xs"
                >
                  Clear
                </Button>
              )}
              
              <Button 
                onClick={() => openModal('create')}
                className="h-9 gap-2 whitespace-nowrap text-sm"
              >
                <Plus size={16} /> 
                <span className="hidden sm:inline">Add New</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedShipmentIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900">
              {selectedShipmentIds.size} shipment{selectedShipmentIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              onClick={() => setShowBulkAssignModal(true)}
              className="gap-2"
            >
              <Users size={16} />
              Assign to Staff
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              className="gap-2"
            >
              <Trash2 size={16} />
              Delete Selected
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedShipmentIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Shipments Table - Desktop */}
      <div className="hidden md:block table-container border rounded-lg">
        <Table className="text-base">
          <TableHeader>
            <TableRow className="bg-gray-50 h-16">
              <TableHead className="w-16 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={selectedShipmentIds.size === filteredShipments.length && filteredShipments.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                  title="Select all"
                />
              </TableHead>
              <TableHead>S/No</TableHead>
              <TableHead>Tracking ID</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <Loader className="animate-spin h-8 w-8 text-blue-500 mb-3" />
                    <p className="text-gray-600">Loading shipments...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedShipments.length > 0 ? (
              paginatedShipments.map((shipment, index) => (
                <TableRow key={shipment._id} className="h-20 hover:bg-gray-50">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedShipmentIds.has(shipment._id)}
                      onChange={() => handleSelectShipment(shipment._id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-base">{startIndex + index + 1}</TableCell>
                  <TableCell className="font-mono text-blue-600 font-bold text-base">{shipment.trackingId}</TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900 text-base">{shipment.recipient.name}</div>
                    <div className="text-gray-500 text-sm mt-1">{shipment.recipient.address}</div>
                  </TableCell>
                  <TableCell className="text-base">
                    <StatusBadge status={shipment.status} />
                  </TableCell>
                  <TableCell className="text-base">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 text-base">
                        {shipment.createdBy?.name || <span className="text-gray-400 italic">System</span>}
                      </span>
                      {canEditShipment(shipment) && (
                        <Badge className="bg-green-100 text-green-800">(You)</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-700 text-base">
                    {shipment.assignedTo?.name || (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500 text-base">
                    {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('view', shipment)}
                      title="View Details"
                    >
                      <Eye size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('update', shipment)}
                      disabled={!canEditShipment(shipment)}
                      title={canEditShipment(shipment) ? "Update Status/Assign" : "Only the creator can edit"}
                    >
                      <Edit size={20} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('delete', shipment)}
                      disabled={!canEditShipment(shipment)}
                      title={canEditShipment(shipment) ? "Cancel Shipment" : "Only the creator can delete"}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <PackageIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No shipments found</h3>
                    <p className="text-gray-500">
                      {shipments.length > 0 
                        ? "No shipments match your filters." 
                        : "No shipments have been created yet."}
                    </p>
                    {shipments.length === 0 && (
                      <Button 
                        onClick={() => openModal('create')}
                        className="mt-4"
                      >
                        Create your first shipment
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Shipments Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
            <Loader className="animate-spin h-8 w-8 text-blue-500 mb-3" />
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
                <span className="text-gray-500 block mb-0.5">Created By</span>
                  <span className="text-gray-900 font-medium">
                    {shipment.createdBy?.name || 'System'}
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
                  <Eye size={14}/>
                  View
                </button>
                <Button 
                  onClick={() => openModal('update', shipment)} 
                  disabled={!canEditShipment(shipment)}
                  variant={canEditShipment(shipment) ? "default" : "secondary"}
                  className="flex-1"
                >
                  <Edit size={14} className="mr-1.5" />
                  Update
                </Button>
                <Button 
                  onClick={() => openModal('delete', shipment)} 
                  disabled={!canEditShipment(shipment)}
                  variant={canEditShipment(shipment) ? "destructive" : "secondary"}
                  className="flex-1"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Delete
                </Button>
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
              <Button 
                onClick={() => openModal('create')}
              >
                Create your first shipment
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredShipments.length > 0 && (
        <div className="flex items-center justify-between mt-6 px-6 py-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-base text-gray-600">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredShipments.length)}</span> of <span className="font-medium">{filteredShipments.length}</span> shipments
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-sm px-4"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="text-sm w-10 h-10 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="text-sm px-4"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      <Dialog open={modalType === 'create'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Shipment</DialogTitle>
            <DialogDescription>
              Enter sender, recipient, and package details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateShipment} autoComplete="off" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sender Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Sender Details</h3>
                <div>
                  <Label htmlFor="sender-name" className="text-xs">Full Name</Label>
                  <Input 
                    id="sender-name"
                    type="text" 
                    placeholder="Sender's full name" 
                    value={senderName} 
                    onChange={(e) => setSenderName(e.target.value)} 
                    autoComplete="off"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="sender-address" className="text-xs">Full Address</Label>
                  <Input 
                    id="sender-address"
                    type="text" 
                    placeholder="Sender's full address" 
                    value={senderAddress} 
                    onChange={(e) => setSenderAddress(e.target.value)} 
                    autoComplete="off"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="sender-phone" className="text-xs">Phone Number</Label>
                  <Input 
                    id="sender-phone"
                    type="tel" 
                    placeholder="Sender's phone number" 
                    value={senderPhone} 
                    onChange={(e) => setSenderPhone(e.target.value)} 
                    autoComplete="off"
                    required 
                  />
                </div>
              </div>
              
              {/* Recipient Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Recipient Details</h3>
                <div>
                  <Label htmlFor="recipient-name" className="text-xs">Full Name</Label>
                  <Input 
                    id="recipient-name"
                    type="text" 
                    placeholder="Recipient's full name" 
                    value={recipientName} 
                    onChange={(e) => setRecipientName(e.target.value)} 
                    autoComplete="off"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="recipient-address" className="text-xs">Full Address</Label>
                  <Input 
                    id="recipient-address"
                    type="text" 
                    placeholder="Recipient's full address" 
                    value={recipientAddress} 
                    onChange={(e) => setRecipientAddress(e.target.value)} 
                    autoComplete="off"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="recipient-phone" className="text-xs">Phone Number</Label>
                  <Input 
                    id="recipient-phone"
                    type="tel" 
                    placeholder="Recipient's phone number" 
                    value={recipientPhone} 
                    onChange={(e) => setRecipientPhone(e.target.value)} 
                    autoComplete="off"
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Branch Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Branch Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="origin-branch" className="text-xs">Origin Branch (Current)</Label>
                  <Input 
                    id="origin-branch"
                    type="text" 
                    value={branches.find(b => b._id === originBranchId)?.name || user?.tenantName || 'Your Branch'} 
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="dest-branch" className="text-xs">Destination Branch</Label>
                  <Select value={destinationBranchId || "none"} onValueChange={(val) => setDestinationBranchId(val === "none" ? "" : val)}>
                    <SelectTrigger id="dest-branch">
                      <SelectValue placeholder="Select Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch: IBranch) => (
                        <SelectItem key={branch._id} value={branch._id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {destinationBranchId && (
                <div className={`p-3 rounded-lg border text-xs font-semibold ${
                  isLocalDelivery 
                    ? 'bg-green-50 border-green-200 text-green-900' 
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  {isLocalDelivery 
                    ? '📍 Local Delivery: This package stays in ' + (branches.find(b => b._id === destinationBranchId)?.name || 'this branch') + '. It can be immediately assigned to a delivery staff member.'
                    : 'Inter-Branch Transfer: This package will be sent to ' + (branches.find(b => b._id === destinationBranchId)?.name || 'the destination') + '. It will require a manifest dispatch.'
                  }
                </div>
              )}
            </div>

            {/* Package Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Package Details</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="weight" className="text-xs">Weight (kg)</Label>
                  <Input 
                    id="weight"
                    type="number" 
                    placeholder="Weight" 
                    value={packageWeight} 
                    onChange={(e) => setPackageWeight(parseFloat(e.target.value))} 
                    required 
                    min="0.1" 
                    step="0.1" 
                  />
                </div>
                <div>
                  <Label htmlFor="pkg-type" className="text-xs">Package Type</Label>
                  <Select value={packageType} onValueChange={setPackageType}>
                    <SelectTrigger id="pkg-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Parcel">Parcel</SelectItem>
                      <SelectItem value="Document">Document</SelectItem>
                      <SelectItem value="Fragile">Fragile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assign-staff" className="text-xs">Assign Staff</Label>
                  <Select value={assignedStaff || "unassigned"} onValueChange={(val) => setAssignedStaff(val === "unassigned" ? "" : val)} disabled={destinationBranchId !== "" && !isLocalDelivery}>
                    <SelectTrigger id="assign-staff" disabled={destinationBranchId !== "" && !isLocalDelivery}>
                      <SelectValue placeholder={destinationBranchId !== "" && !isLocalDelivery ? "Not available for inter-branch" : "None"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">-- None --</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver._id} value={driver._id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center">
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Saving...
                  </span>
                ) : 'Create Shipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* UPDATE MODAL */}
      {modalType === 'update' && selectedShipment && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={handleUpdateShipment} autoComplete="off">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Update Shipment</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Update status or assign a driver for <span className="font-semibold">{selectedShipment.trackingId}</span>.
                </p>
              </div>
              
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-5">
                <div>
                  <Label htmlFor="update-status" className="text-sm">Status</Label>
                  <Select value={updateStatus || ''} onValueChange={(val) => setUpdateStatus(val as IShipment['status'])}>
                    <SelectTrigger id="update-status" className="mt-2">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="At Origin Branch">At Origin Branch</SelectItem>
                      <SelectItem value="In Transit to Destination">In Transit to Destination</SelectItem>
                      <SelectItem value="At Destination Branch">At Destination Branch</SelectItem>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assign-driver" className="text-sm">Assign to Driver</Label>
                  <Select value={updateAssignedTo || 'unassigned'} onValueChange={(val) => setUpdateAssignedTo(val === 'unassigned' ? '' : val)}>
                    <SelectTrigger id="assign-driver" className="mt-2">
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver._id} value={driver._id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="update-notes" className="text-sm">Notes (Optional)</Label>
                  <Textarea
                    id="update-notes"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    autoComplete="off"
                    placeholder="e.g., Reason for delivery failure"
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-sm"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {modalType === 'delete' && selectedShipment && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Cancel Shipment</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to cancel shipment <span className="font-semibold">{selectedShipment.trackingId}</span>? 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
                className="text-sm"
              >
                No, Keep It
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteShipment}
                disabled={isSubmitting}
                className="text-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </span>
                ) : 'Yes, Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL - SHEET */}
      <Sheet open={modalType === 'view'} onOpenChange={(open) => !open && closeModal()}>
        <SheetContent style={{ width: '90vw', maxWidth: '600px' }} className="overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div>
              <SheetTitle className="text-2xl font-bold">Shipment Details</SheetTitle>
              <SheetDescription className="text-sm text-gray-600 mt-1">
                Tracking ID: <span className="font-mono font-semibold text-gray-900">{selectedShipment?.trackingId}</span>
              </SheetDescription>
            </div>
          </SheetHeader>

          {selectedShipment && (
            <div className="px-6 py-6 space-y-8">
              {/* Sender & Recipient */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Sender Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                      <p className="text-sm text-gray-900 font-medium mt-1">{selectedShipment.sender.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-900 mt-1 line-clamp-2">{selectedShipment.sender.address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-gray-900 font-medium mt-1">{selectedShipment.sender.phone}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Recipient Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</p>
                      <p className="text-sm text-gray-900 font-medium mt-1">{selectedShipment.recipient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-900 mt-1 line-clamp-2">{selectedShipment.recipient.address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-gray-900 font-medium mt-1">{selectedShipment.recipient.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200"></div>

              {/* Package Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Package Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Weight</p>
                    <p className="text-lg font-bold text-blue-900 mt-2">{selectedShipment.packageInfo.weight} kg</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Type</p>
                    <p className="text-lg font-bold text-purple-900 mt-2">{selectedShipment.packageInfo.type}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</p>
                    <div className="mt-2">
                      <StatusBadge status={selectedShipment.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200"></div>

              {/* Status History Timeline */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-5">Status History</h3>
                {selectedShipment.statusHistory && selectedShipment.statusHistory.length > 0 ? (
                  <div className="space-y-5">
                    {selectedShipment.statusHistory.map((history, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                          {index !== selectedShipment.statusHistory.length - 1 && (
                            <div className="w-0.5 h-16 bg-gray-300 my-2"></div>
                          )}
                        </div>
                        <div className="pb-2 flex-1">
                          <p className="font-semibold text-gray-900">{history.status}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(history.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {history.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic border-l-2 border-gray-300 pl-3">\"{ history.notes}\"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">No history available.</div>
                )}
              </div>
              
              {/* Delivery Proof Section */}
              {(selectedShipment.status === 'Delivered' || selectedShipment.status === 'Failed') && (
                <>
                  <div className="h-px bg-gray-200"></div>
                  <div>
                    {selectedShipment.status === 'Delivered' && selectedShipment.deliveryProof && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => setProofImagePreview(selectedShipment.deliveryProof!.url)}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded border-2 border-green-300 hover:border-green-400 overflow-hidden flex-shrink-0 transition-colors"
                        >
                          <img src={selectedShipment.deliveryProof.url} alt="Proof" className="w-full h-full object-cover" />
                        </button>
                        <div>
                          <p className="text-xs font-semibold text-green-700">Delivery Proof</p>
                          <p className="text-xs text-gray-500">Click to enlarge</p>
                        </div>
                      </div>
                    )}
              
                    {selectedShipment.status === 'Failed' && selectedShipment.failureReason && (
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Delivery Failed</h3>
                        <p className="text-sm text-gray-700"><strong>Reason:</strong> {selectedShipment.failureReason}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      {/* Image Preview Modal */}
      {proofImagePreview && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setProofImagePreview(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Proof View</h3>
              <button
                onClick={() => setProofImagePreview(null)}
                className="text-gray-500 hover:text-gray-700 font-semibold text-xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-6 flex justify-center bg-gray-50 overflow-auto">
              <img src={proofImagePreview || ''} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Assign to Staff</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Assign {selectedShipmentIds.size} shipment{selectedShipmentIds.size > 1 ? 's' : ''} to a driver
              </p>
            </div>
            
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <Label htmlFor="bulk-driver" className="text-sm">Select Driver</Label>
              <Select value={bulkAssignDriver || ''} onValueChange={setBulkAssignDriver}>
                <SelectTrigger id="bulk-driver" className="mt-2">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(driver => (
                    <SelectItem key={driver._id} value={driver._id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setBulkAssignDriver('');
                }}
                disabled={isSubmitting}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={isSubmitting || !bulkAssignDriver}
                className="text-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Assigning...
                  </span>
                ) : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}