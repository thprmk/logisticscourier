// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Search, Building, Package as PackageIcon, Loader, Users, X } from 'lucide-react';
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
    role: 'superAdmin' | 'admin' | 'staff';
    isManager?: boolean;
  };

  originBranchId?: string | IBranch;
  destinationBranchId?: string | IBranch;
  currentBranchId?: string | IBranch;
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
  const searchParams = useSearchParams();
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
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(undefined);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined);

  // Update status filter when URL parameter changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

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
    if (dateRangeStart && dateRangeEnd) {
      console.log('Filtering by date range:', { dateRangeStart, dateRangeEnd });
      // Set end date to end of day for inclusive filtering
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(shipment => {
        const shipmentDate = new Date(shipment.createdAt);
        console.log('Comparing:', { shipmentDate: shipmentDate.toISOString(), dateRangeStart: dateRangeStart.toISOString(), endDate: endDate.toISOString(), match: shipmentDate >= dateRangeStart && shipmentDate <= endDate });
        return shipmentDate >= dateRangeStart && shipmentDate <= endDate;
      });
      console.log('Filtered shipments count:', filtered.length);
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

  // Check if user can edit this shipment
  // - Can edit if from origin branch (creator authority) OR current branch (local operations like assigning drivers)
  // - Can only DELETE if creator from origin branch
  const canEditShipment = (shipment: IShipment): boolean => {
    const originId = typeof shipment.originBranchId === 'string' ? shipment.originBranchId : (shipment.originBranchId as any)?._id;
    const currentId = typeof shipment.currentBranchId === 'string' ? shipment.currentBranchId : (shipment.currentBranchId as any)?._id;
    const isFromOriginBranch = user?.tenantId === originId;
    const isFromCurrentBranch = user?.tenantId === currentId;
    return isFromOriginBranch || isFromCurrentBranch;
  };

  const canDeleteShipment = (shipment: IShipment): boolean => {
    const originId = typeof shipment.originBranchId === 'string' ? shipment.originBranchId : (shipment.originBranchId as any)?._id;
    return user?.id === shipment.createdBy?._id && user?.tenantId === originId;
  };

  const openModal = (type: ModalType, shipment?: IShipment) => {
    // Check permissions before opening edit/delete modals
    if (type === 'delete' && shipment && !canDeleteShipment(shipment)) {
      toast.error('Only the creator from the origin branch can delete this shipment');
      return;
    }
    if (type === 'update' && shipment && !canEditShipment(shipment)) {
      toast.error('You can only edit shipments from your branch or the origin branch');
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
        'At Origin Branch': 'bg-[#8B5CF6] text-white', // Purple - starting point
        'In Transit to Destination': 'bg-[#3B82F6] text-white', // Blue - in movement
        'At Destination Branch': 'bg-[#2563EB] text-white', // Darker blue - arrived at destination
        'Assigned': 'bg-[#06B6D4] text-white', // Cyan - assigned to staff
        'Out for Delivery': 'bg-[#F97316] text-white', // Orange - active delivery
        'Delivered': 'bg-[#16A34A] text-white', // Solid green - success/completed
        'Failed': 'bg-[#E11D48] text-white', // Solid red - error/failure
    };
    return (
        <span className={`px-3 py-1 text-sm font-medium rounded-full text-white ${styles[status] || 'bg-gray-600 text-white'}`}>
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
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Shipment Management</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-white mt-1 sm:mt-2">Create, track, and manage all shipments for your branch.</p>
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
            className="pl-10 h-10 sm:h-9 text-sm touch-manipulation"
          />
        </div>

        {/* Filters and Button */}
        <div className="flex flex-col gap-3 sm:gap-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3 items-end">
            {/* Status Filter */}
            <div className="w-full">
              <Label htmlFor="filter-status" className="text-xs sm:text-xs font-medium text-gray-700 dark:text-[#E5E5E5] block mb-1.5 sm:mb-2">Status</Label>
              <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="filter-status" className="h-10 sm:h-9 text-sm w-full touch-manipulation">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
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
            <div className="w-full">
              <Label htmlFor="filter-assigned" className="text-xs sm:text-xs font-medium text-gray-700 dark:text-[#E5E5E5] block mb-1.5 sm:mb-2">Assigned Staff</Label>
              <Select value={assignedToFilter || 'all'} onValueChange={(val) => setAssignedToFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="filter-assigned" className="h-10 sm:h-9 text-sm w-full touch-manipulation">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
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
            <div className="w-full">
              <Label htmlFor="filter-created" className="text-xs sm:text-xs font-medium text-gray-700 dark:text-[#E5E5E5] block mb-1.5 sm:mb-2">Created By</Label>
              <Select value={createdByFilter || 'all'} onValueChange={(val) => setCreatedByFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="filter-created" className="h-10 sm:h-9 text-sm w-full touch-manipulation">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Users</SelectItem>
                  {admins.map(admin => (
                    <SelectItem key={admin._id} value={admin._id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="w-full">
              <Label className="text-xs sm:text-xs font-medium text-gray-700 dark:text-[#E5E5E5] block mb-1.5 sm:mb-2">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 sm:h-9 w-full justify-start text-sm font-normal touch-manipulation"
                  >
                    {dateRangeStart && dateRangeEnd
                      ? dateRangeStart.toDateString() === dateRangeEnd.toDateString()
                        ? <span className="truncate">{dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        : <span className="truncate">{dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      : 'Pick date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)] sm:max-w-none" align="start" side="bottom" sideOffset={4}>
                  <div className="p-2 sm:p-3">
                    {(dateRangeStart || dateRangeEnd) && (
                      <div className="mb-2 sm:mb-3 text-xs text-gray-600 dark:text-[#A3A3A3] px-1">
                        {dateRangeStart && dateRangeEnd && dateRangeStart.toDateString() === dateRangeEnd.toDateString() && (
                          <span>
                            <span className="font-semibold text-blue-600">Selected:</span> {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {dateRangeStart && dateRangeEnd && dateRangeStart.toDateString() !== dateRangeEnd.toDateString() && (
                          <span>
                            <span className="font-semibold text-blue-600">Range:</span> {dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}
                      <Calendar
                        mode="single"
                      selected={dateRangeStart || undefined}
                        onSelect={(date) => {
                        if (!date) return;
                        
                        // First click: set start date (single date by default)
                        if (!dateRangeStart) {
                          setDateRangeStart(date);
                            setDateRangeEnd(date);
                        }
                        // Second click: determine if range or single date
                        else if (!dateRangeEnd || dateRangeStart.toDateString() === dateRangeEnd.toDateString()) {
                          // If clicking same date, keep as single date
                          if (date.toDateString() === dateRangeStart.toDateString()) {
                            return;
                          }
                          // If clicking before start, swap
                          else if (date < dateRangeStart) {
                            setDateRangeEnd(dateRangeStart);
                            setDateRangeStart(date);
                          }
                          // If clicking after start, create range
                          else {
                          setDateRangeEnd(date);
                          }
                        }
                        // Both dates exist: reset and start fresh
                        else {
                          setDateRangeStart(date);
                          setDateRangeEnd(date);
                        }
                      }}
                      disabled={(date) => false}
                      className="rounded-md"
                    />
                    {dateRangeStart && dateRangeEnd && (
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDateRangeStart(undefined);
                            setDateRangeEnd(undefined);
                          }}
                          className="flex-1 text-xs h-9 sm:h-8 touch-manipulation"
                        >
                          Clear
                        </Button>
                    </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <div className="w-full sm:w-auto flex items-end gap-2 sm:gap-2">
              {(statusFilter || assignedToFilter || createdByFilter || dateRangeStart || dateRangeEnd) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllFilters}
                  className="h-10 sm:h-9 text-xs sm:text-xs flex-1 sm:flex-none min-w-[80px] touch-manipulation"
                >
                  Clear
                </Button>
              )}
              
              <Button 
                onClick={() => openModal('create')}
                className="h-10 sm:h-9 gap-2 whitespace-nowrap text-sm bg-[#1A9D4A] hover:bg-[#158A3F] text-white flex-1 sm:flex-none min-w-[100px] touch-manipulation"
              >
                <Plus size={16} className="flex-shrink-0" /> 
                <span className="hidden sm:inline">Add New Shipment</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedShipmentIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-[#222222] border border-blue-200 dark:border-[#333333] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedShipmentIds.size} shipment{selectedShipmentIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              onClick={() => setShowBulkAssignModal(true)}
              className="gap-2 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
            >
              <Users size={16} />
              Assign to Staff
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              className="gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
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
      <div className="hidden md:block table-container border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#222222]">
        <Table className="text-base w-full table-auto">
          <TableHeader>
            <TableRow className="bg-gray-50/80 dark:bg-[#222222] border-b border-gray-200 dark:border-[#333333] hover:bg-gray-50/80 dark:hover:bg-[#222222]">
              <TableHead className="w-10 px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedShipmentIds.size === filteredShipments.length && filteredShipments.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 cursor-pointer"
                  title="Select all"
                />
              </TableHead>
              <TableHead className="w-12 px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">S/No</TableHead>
              <TableHead className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Tracking ID</TableHead>
              <TableHead className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Recipient</TableHead>
              <TableHead className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Created By</TableHead>
              <TableHead className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Assigned To</TableHead>
              <TableHead className="px-2 py-3 text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Date</TableHead>
              <TableHead className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-700 dark:text-[#E5E5E5] uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <Loader className="animate-spin h-8 w-8 text-blue-500 mb-3" />
                    <p className="text-gray-600 dark:text-[#A3A3A3] text-sm">Loading shipments...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedShipments.length > 0 ? (
              paginatedShipments.map((shipment, index) => (
                <TableRow key={shipment._id} className="border-b border-gray-100 dark:border-[#333333]">
                  <TableCell className="px-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedShipmentIds.has(shipment._id)}
                      onChange={() => handleSelectShipment(shipment._id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="px-2 py-2.5 font-medium text-sm text-gray-900 dark:text-[#E5E5E5]">{startIndex + index + 1}</TableCell>
                  <TableCell className="px-2 py-2.5">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold text-sm hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer">{shipment.trackingId}</span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <div className="font-semibold text-gray-900 dark:text-[#E5E5E5] text-sm">{shipment.recipient.name}</div>
                    <div className="text-gray-500 dark:text-[#A3A3A3] text-xs mt-0.5 line-clamp-1">{shipment.recipient.address}</div>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <StatusBadge status={shipment.status} />
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-gray-700 dark:text-[#E5E5E5] text-sm font-medium">
                        {shipment.createdBy ? (
                          user?.id === shipment.createdBy._id ? 'You' : shipment.createdBy.name
                        ) : (
                          <span className="text-gray-400 dark:text-[#A3A3A3] italic">System</span>
                        )}
                      </span>
                      {shipment.createdBy && user?.id !== shipment.createdBy._id && (
                        <Badge 
                          className={`text-xs px-1 py-0.5 text-white ${
                            shipment.createdBy.role === 'superAdmin' ? 'bg-[#3B82F6]' :
                            shipment.createdBy.role === 'admin' && shipment.createdBy.isManager ? 'bg-[#9333EA]' : 
                            shipment.createdBy.role === 'admin' ? 'bg-[#06B6D4]' :
                            'bg-[#10B981]'
                          }`}
                        >
                          {shipment.createdBy.role === 'superAdmin' ? 'Super Admin' :
                           shipment.createdBy.role === 'admin' && shipment.createdBy.isManager ? 'Branch Manager' : 
                           shipment.createdBy.role === 'admin' ? 'Dispatcher' : 'Delivery Staff'}
                        </Badge>
                      )}
                      {user?.id === shipment.createdBy?._id && (
                        <Badge className="bg-[#10B981] text-white font-semibold text-xs px-1 py-0.5">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <span className="text-gray-700 dark:text-[#E5E5E5] text-sm">
                    {shipment.assignedTo?.name || (
                      <span className="text-gray-400 dark:text-[#A3A3A3] italic">Unassigned</span>
                    )}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <span className="text-gray-600 dark:text-[#A3A3A3] text-sm whitespace-nowrap">
                    {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('view', shipment)}
                      title="View Details"
                        className="h-7 w-7 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        <Eye size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('update', shipment)}
                      disabled={!canEditShipment(shipment)}
                      title={canEditShipment(shipment) ? "Update Status/Assign" : "Only the creator can edit"}
                        className="h-7 w-7 p-0 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
                    >
                        <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('delete', shipment)}
                      disabled={!canEditShipment(shipment)}
                      title={canEditShipment(shipment) ? "Cancel Shipment" : "Only the creator can delete"}
                        className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                    >
                        <Trash2 size={14} />
                    </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center">
                    <PackageIcon className="h-12 w-12 text-gray-300 dark:text-[#A3A3A3] mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-[#E5E5E5] mb-1">No shipments found</h3>
                    <p className="text-gray-500 dark:text-[#A3A3A3] text-sm">
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
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[#E5E5E5]">{shipment.recipient.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-[#A3A3A3] mt-0.5 line-clamp-1">{shipment.recipient.address}</p>
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
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Eye size={14}/>
                  View
                </button>
                <Button 
                  onClick={() => openModal('update', shipment)} 
                  disabled={!canEditShipment(shipment)}
                  variant={canEditShipment(shipment) ? "default" : "secondary"}
                  className="flex-1 bg-[#1A9D4A] hover:bg-[#158A3F] text-white disabled:opacity-50"
                >
                  <Edit size={14} className="mr-1.5" />
                  Update
                </Button>
                <Button 
                  onClick={() => openModal('delete', shipment)} 
                  disabled={!canEditShipment(shipment)}
                  variant={canEditShipment(shipment) ? "destructive" : "secondary"}
                  className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white disabled:opacity-50"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333]">
            <PackageIcon className="h-12 w-12 text-gray-300 dark:text-[#A3A3A3] mb-3" />
            <h3 className="text-base font-medium text-gray-900 dark:text-[#E5E5E5] mb-1">No shipments found</h3>
            <p className="text-sm text-gray-500 dark:text-[#A3A3A3] text-center px-4">
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
        <div className="flex items-center justify-between mt-6 px-6 py-4 bg-white dark:bg-[#222222] border border-gray-200 dark:border-[#333333] rounded-lg">
          <div className="text-base text-gray-600 dark:text-white">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredShipments.length)}</span> of <span className="font-medium">{filteredShipments.length}</span> shipments
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-sm px-4 dark:text-white"
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
                  className={`text-sm w-10 h-10 p-0 ${currentPage === page ? 'bg-[#1A9D4A] hover:bg-[#158A3F] text-white' : 'dark:text-white'}`}
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
              className="text-sm px-4 dark:text-white"
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
              <Button type="submit" disabled={isSubmitting} className="bg-[#1A9D4A] hover:bg-[#158A3F] text-white">
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
        <Dialog open={true} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Shipment</DialogTitle>
              <DialogDescription>
                Update status or assign a driver for <span className="font-semibold">{selectedShipment.trackingId}</span>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateShipment} autoComplete="off" className="space-y-5">
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE MODAL */}
      {modalType === 'delete' && selectedShipment && (
        <Dialog open={true} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="max-w-md dark:bg-[#222222] dark:border-[#333333]">
            <DialogHeader>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="dark:text-white">Cancel Shipment</DialogTitle>
                  <DialogDescription className="mt-1 dark:text-[#A3A3A3]">
                    Are you sure you want to cancel shipment <span className="font-semibold text-gray-900 dark:text-white">{selectedShipment.trackingId}</span>? 
                    This action cannot be undone.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={isSubmitting}
                className="dark:text-white"
              >
                No, Keep It
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteShipment}
                disabled={isSubmitting}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Cancelling...
                  </span>
                ) : 'Yes, Cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* VIEW MODAL - SHEET */}
      <Sheet open={modalType === 'view'} onOpenChange={(open) => !open && closeModal()}>
        <SheetContent style={{ width: '90vw', maxWidth: '600px' }} className="overflow-y-auto p-0 dark:bg-[#222222]">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-[#333333] sticky top-0 bg-white dark:bg-[#222222] z-10">
            <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold dark:text-white">Shipment Details</SheetTitle>
              <SheetDescription className="text-sm text-gray-600 dark:text-[#A3A3A3] mt-1">
                Tracking ID: <span className="font-mono font-semibold text-gray-900 dark:text-white">{selectedShipment?.trackingId}</span>
              </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-[#333333] dark:text-white"
                title="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {selectedShipment && (
            <div className="px-6 py-6 space-y-8">
              {/* Sender & Recipient */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Sender Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#A3A3A3] uppercase tracking-wide">Name</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{selectedShipment.sender.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#A3A3A3] uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-2">{selectedShipment.sender.address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#A3A3A3] uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{selectedShipment.sender.phone}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recipient Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#A3A3A3] uppercase tracking-wide">Name</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{selectedShipment.recipient.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#A3A3A3] uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-2">{selectedShipment.recipient.address}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-[#A3A3A3] uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">{selectedShipment.recipient.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200 dark:bg-[#333333]"></div>

              {/* Package Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Package Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30 flex flex-col">
                    <p className="text-xs font-medium text-gray-600 dark:text-[#A3A3A3] uppercase tracking-wide mb-2">Weight</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-400">{selectedShipment.packageInfo.weight} kg</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30 flex flex-col">
                    <p className="text-xs font-medium text-gray-600 dark:text-[#A3A3A3] uppercase tracking-wide mb-2">Type</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-400">{selectedShipment.packageInfo.type}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800/30 flex flex-col">
                    <p className="text-xs font-medium text-gray-600 dark:text-[#A3A3A3] uppercase tracking-wide mb-2">Status</p>
                    <div className="flex items-center">
                      <StatusBadge status={selectedShipment.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200 dark:bg-[#333333]"></div>

              {/* Status History Timeline */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">Status History</h3>
                {selectedShipment.statusHistory && selectedShipment.statusHistory.length > 0 ? (
                  <div className="space-y-5">
                    {selectedShipment.statusHistory.map((history, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mt-1.5"></div>
                          {index !== selectedShipment.statusHistory.length - 1 && (
                            <div className="w-0.5 h-16 bg-gray-300 dark:bg-[#333333] my-2"></div>
                          )}
                        </div>
                        <div className="pb-2 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-white">{history.status}</p>
                          <p className="text-xs text-gray-500 dark:text-[#A3A3A3] mt-1">
                            {new Date(history.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {history.notes && (
                            <p className="text-sm text-gray-800 dark:text-white font-medium mt-2 border-l-2 border-gray-400 dark:border-[#555555] pl-3">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-[#A3A3A3] bg-gray-50 dark:bg-[#2A2A2A] p-3 rounded">No history available.</div>
                )}
              </div>
              
              {/* Delivery Proof Section */}
              {(selectedShipment.status === 'Delivered' || selectedShipment.status === 'Failed') && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-[#333333]"></div>
                  <div>
                    {selectedShipment.status === 'Delivered' && selectedShipment.deliveryProof && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => setProofImagePreview(selectedShipment.deliveryProof!.url)}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded border-2 border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500 overflow-hidden flex-shrink-0 transition-colors"
                        >
                          <img src={selectedShipment.deliveryProof.url} alt="Proof" className="w-full h-full object-cover" />
                        </button>
                        <div>
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400">Delivery Proof</p>
                          <p className="text-xs text-gray-500 dark:text-[#A3A3A3]">Click to enlarge</p>
                        </div>
                      </div>
                    )}
              
                    {selectedShipment.status === 'Failed' && selectedShipment.failureReason && (
                      <div className="border border-gray-200 dark:border-[#333333] rounded-lg p-3 bg-white dark:bg-[#222222]">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Delivery Failed</h3>
                        <p className="text-sm text-gray-700 dark:text-[#E5E5E5]"><strong>Reason:</strong> {selectedShipment.failureReason}</p>
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
          <div className="bg-white dark:bg-[#222222] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 dark:border-[#333333]">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Proof View</h3>
              <button
                onClick={() => setProofImagePreview(null)}
                className="text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-semibold text-xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-6 flex justify-center bg-gray-50 dark:bg-[#1C1C1C] overflow-auto">
              <img src={proofImagePreview || ''} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white dark:bg-[#222222] rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-[#333333]">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Assign to Staff</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-[#A3A3A3] mt-1">
                Assign {selectedShipmentIds.size} shipment{selectedShipmentIds.size > 1 ? 's' : ''} to a driver
              </p>
            </div>
            
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <Label htmlFor="bulk-driver" className="text-sm dark:text-white">Select Driver</Label>
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
            
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-4 bg-gray-50 dark:bg-[#222222] rounded-b-lg border-t border-gray-200 dark:border-[#333333]">
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
                className="text-sm bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
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