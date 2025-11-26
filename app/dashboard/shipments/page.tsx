// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Search, ChevronDown, Building, Package as PackageIcon, X, Filter, CheckSquare, Square } from 'lucide-react';

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
  const [modalType, setModalType] = useState<ModalType>(null);
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
    // Auto-refresh every 10 seconds to catch real-time updates from manifest receipts
    const interval = setInterval(() => {
      fetchData();
    }, 10000);
    return () => clearInterval(interval);
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

  const openModal = (type: ModalType, shipment?: IShipment) => {
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

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipment Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Create, track, and manage all shipments for your branch.</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="h-10 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md whitespace-nowrap flex items-center justify-center gap-2 sm:w-auto w-full"
        >
          <Plus size={18} />
          <span>Add New Shipment</span>
        </button>
      </div>

      {/* Search & Filters Section */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        {/* Search Bar - Left Side */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tracking, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:border-gray-400 transition-all placeholder:text-gray-400 font-medium"
          />
        </div>

        {/* Filter Controls - Right Side */}
        <div className="flex flex-wrap lg:flex-nowrap items-end gap-2 lg:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all font-medium flex-1 sm:flex-initial sm:w-32"
          >
            <option value="">All Status</option>
            <option value="At Origin Branch">At Origin</option>
            <option value="In Transit to Destination">In Transit</option>
            <option value="At Destination Branch">At Destination</option>
            <option value="Assigned">Assigned</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Failed">Failed</option>
          </select>
          
          <select
            value={filterAssignedTo}
            onChange={(e) => setFilterAssignedTo(e.target.value)}
            className="h-10 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all font-medium flex-1 sm:flex-initial sm:w-32"
          >
            <option value="">All Staff</option>
            {drivers.map(driver => (
              <option key={driver._id} value={driver._id}>
                {driver.name}
              </option>
            ))}
          </select>
          
          {/* Date Range - Single Control */}
          <div className="flex-1 sm:flex-initial sm:w-auto">
            <div className="flex items-center gap-1 h-10 px-3 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent hover:border-gray-400 transition-all">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-full text-xs bg-transparent border-0 outline-none w-20 focus:ring-0 p-0 font-medium"
              />
              <span className="text-xs text-gray-400 font-medium">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-full text-xs bg-transparent border-0 outline-none w-20 focus:ring-0 p-0 font-medium"
              />
            </div>
          </div>
          
          <button
            onClick={clearFiltersAndState}
            className="h-10 px-3 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-all whitespace-nowrap"
          >
            Clear
          </button>
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
            <div className="relative flex-1 sm:flex-none min-w-[200px]">
              <select
                value={bulkAssignStaff}
                onChange={(e) => setBulkAssignStaff(e.target.value)}
                disabled={!canAssignToStaff}
                className="h-11 w-full pl-4 pr-10 text-sm bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-medium transition-all"
              >
                <option value="">Select Staff Member</option>
                {drivers.map(driver => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDown size={18} className="text-gray-400" />
              </div>
            </div>
            <div className="relative group">
              <button
                onClick={handleBulkAssign}
                disabled={!canAssignToStaff || !bulkAssignStaff || isSubmitting}
                title={!canAssignToStaff ? getAssignmentDisabledReason : ''}
                className="px-5 py-2.5 h-11 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 whitespace-nowrap transition-all shadow-sm hover:shadow-md"
              >
                {isSubmitting ? 'Assigning...' : 'Assign to Staff'}
              </button>
              {!canAssignToStaff && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                  {getAssignmentDisabledReason}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
            <button
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="px-5 py-2.5 h-11 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Selected'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-5 py-2.5 h-11 text-gray-700 bg-white border border-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters Panel - Removed (now integrated above) */}
      <div className="hidden md:block table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="table-header w-14 px-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-blue-100 transition-colors group"
                  title={selectedIds.size === filteredShipments.length ? 'Deselect All' : 'Select All'}
                >
                  {selectedIds.size === filteredShipments.length && filteredShipments.length > 0 ? (
                    <CheckSquare size={20} className="text-blue-600" />
                  ) : (
                    <Square size={20} className="text-gray-400 group-hover:text-gray-600" />
                  )}
                </button>
              </th>
              <th scope="col" className="table-header">S/No</th>
              <th scope="col" className="table-header">Tracking ID</th>
              <th scope="col" className="table-header">Recipient</th>
              <th scope="col" className="table-header">Status</th>
              <th scope="col" className="table-header">Assigned To</th>
              <th scope="col" className="table-header">Date</th>
              <th scope="col" className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="table-cell text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <p className="text-gray-600">Loading shipments...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedShipments.length > 0 ? (
              paginatedShipments.map((shipment, index) => (
                <tr key={shipment._id} className={`table-row ${selectedIds.has(shipment._id) ? 'bg-blue-50' : ''}`}>
                  <td className="table-cell w-14 px-3">
                    <button
                      onClick={() => toggleSelectShipment(shipment._id)}
                      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-blue-100 transition-colors group"
                    >
                      {selectedIds.has(shipment._id) ? (
                        <CheckSquare size={20} className="text-blue-600" />
                      ) : (
                        <Square size={20} className="text-gray-400 group-hover:text-gray-600" />
                      )}
                    </button>
                  </td>
                  <td className="table-cell font-medium">{startIndex + index + 1}</td>
                  <td className="table-cell font-mono text-blue-600 font-medium">{shipment.trackingId}</td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-900">{shipment.recipient.name}</div>
                    <div className="text-gray-500 text-sm mt-1">{shipment.recipient.address}</div>
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td className="table-cell text-gray-700">
                    {shipment.assignedTo?.name || (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="table-cell text-gray-500">
                    {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="table-cell text-right space-x-2">
                    <button
                      onClick={() => openModal('view', shipment)}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => openModal('update', shipment)}
                      className="p-2 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                      title="Update Status/Assign"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => openModal('delete', shipment)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      title="Cancel Shipment"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="table-cell text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <PackageIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No shipments found</h3>
                    <p className="text-gray-500">
                      {shipments.length > 0
                        ? "No shipments match your filters."
                        : "No shipments have been created yet."}
                    </p>
                    {shipments.length === 0 && (
                      <button
                        onClick={() => openModal('create')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create your first shipment
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {filteredShipments.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 bg-white border-t border-gray-200 rounded-b-xl">
            <div className="text-sm font-medium text-gray-700">
              Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredShipments.length)}</span> of <span className="font-semibold text-gray-900">{filteredShipments.length}</span> shipments
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-all"
              >
                ← Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-10 h-10 px-3 text-sm font-semibold rounded-lg transition-all ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-all"
              >
                Next →
              </button>
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

      {/* CREATE MODAL */}
      {modalType === 'create' && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 transform transition-all flex flex-col">
            <form onSubmit={handleCreateShipment} className="flex flex-col h-full">
              <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Create New Shipment</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Enter sender, recipient, and package details below.</p>
              </div>

              <div className="px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto flex-grow" style={{ maxHeight: 'calc(80vh - 180px)' }}>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-gray-900">Sender Details</legend>
                  <div className="space-y-2">
                    <div>
                      <label className="form-label text-xs">Full Name</label>
                      <input
                        type="text"
                        placeholder="Sender's full name"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        autoComplete="name"
                        className="form-input text-sm py-2 relative z-10"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Full Address</label>
                      <input
                        type="text"
                        placeholder="Sender's full address"
                        value={senderAddress}
                        onChange={(e) => setSenderAddress(e.target.value)}
                        autoComplete="street-address"
                        className="form-input text-sm py-2 relative z-10"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Sender's phone number"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        autoComplete="tel"
                        className="form-input text-sm py-2 relative z-10"
                        required
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-gray-900">Recipient Details</legend>
                  <div className="space-y-2">
                    <div>
                      <label className="form-label text-xs">Full Name</label>
                      <input
                        type="text"
                        placeholder="Recipient's full name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        autoComplete="name"
                        className="form-input text-sm py-2 relative z-10"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Full Address</label>
                      <input
                        type="text"
                        placeholder="Recipient's full address"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        autoComplete="street-address"
                        className="form-input text-sm py-2 relative z-10"
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Recipient's phone number"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        autoComplete="tel"
                        className="form-input text-sm py-2 relative z-10"
                        required
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="md:col-span-2 space-y-3">
                  <legend className="text-sm font-semibold text-gray-900">Branch Details</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs">Origin Branch (Current) *</label>
                      <input
                        type="text"
                        value={branches.find(b => b._id === originBranchId)?.name || user?.tenantName || 'Your Branch'}
                        disabled
                        className="form-input text-sm py-2 bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Destination Branch *</label>
                      <select
                        value={destinationBranchId}
                        onChange={(e) => setDestinationBranchId(e.target.value)}
                        className="form-select text-sm py-2"
                        required
                      >
                        <option value="">-- Select Destination --</option>
                        {branches.map((branch: IBranch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Show delivery type info */}
                  {destinationBranchId && (
                    <div className={`p-3 rounded-lg border ${isLocalDelivery ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                      <p className={`text-xs font-semibold ${isLocalDelivery ? 'text-green-900' : 'text-blue-900'}`}>
                        {isLocalDelivery
                          ? '📍 Local Delivery: This package stays in ' + (branches.find(b => b._id === destinationBranchId)?.name || 'this branch') + '. It can be immediately assigned to a delivery staff member.'
                          : 'Inter-Branch Transfer: This package will be sent to ' + (branches.find(b => b._id === destinationBranchId)?.name || 'the destination') + '. It will require a manifest dispatch.'
                        }
                      </p>
                    </div>
                  )}
                </fieldset>

                <fieldset className="md:col-span-2 space-y-3">
                  <legend className="text-sm font-semibold text-gray-900">Package Details</legend>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label text-xs">Weight (kg)</label>
                      <input
                        type="number"
                        placeholder="Weight"
                        value={packageWeight}
                        onChange={(e) => setPackageWeight(parseFloat(e.target.value))}
                        className="form-input text-sm py-2"
                        required
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Package Type</label>
                      <select
                        value={packageType}
                        onChange={(e) => setPackageType(e.target.value)}
                        className="form-select text-sm py-2"
                      >
                        <option value="Parcel">Parcel</option>
                        <option value="Document">Document</option>
                        <option value="Fragile">Fragile</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-xs">Assign Staff</label>
                      <select
                        value={assignedStaff}
                        onChange={(e) => setAssignedStaff(e.target.value)}
                        disabled={!isLocalDelivery}
                        className="form-select text-sm py-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        <option value="">-- None --</option>
                        {drivers.map(driver => (
                          <option key={driver._id} value={driver._id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                      {!isLocalDelivery && destinationBranchId && (
                        <p className="text-xs text-gray-500 mt-1 italic">Only available for local deliveries</p>
                      )}
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-3 sm:px-4 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {modalType === 'update' && selectedShipment && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
            <form onSubmit={handleUpdateShipment}>
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Update Shipment</h2>
                <p className="text-xs sm:text-base text-gray-600 mt-1">
                  Update status or assign a driver for <span className="font-semibold">{selectedShipment.trackingId}</span>.
                </p>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-5">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value as IShipment['status'])}
                    className="form-select"
                  >
                    <option value="At Origin Branch">At Origin Branch</option>
                    <option value="In Transit to Destination">In Transit to Destination</option>
                    <option value="At Destination Branch">At Destination Branch</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Assign to Driver</label>
                  <select
                    value={updateAssignedTo}
                    onChange={(e) => setUpdateAssignedTo(e.target.value)}
                    className="form-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {drivers.map(driver => (
                      <option key={driver._id} value={driver._id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    rows={3}
                    className="form-input"
                    placeholder="e.g., Reason for delivery failure"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {modalType === 'delete' && selectedShipment && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">Cancel Shipment</h2>
                  <p className="text-gray-600 mt-1">
                    Are you sure you want to cancel shipment <span className="font-semibold">{selectedShipment.trackingId}</span>?
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                No, Keep It
              </button>
              <button
                onClick={handleDeleteShipment}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-base font-medium text-white bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cancelling...
                  </span>
                ) : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modalType === 'view' && selectedShipment && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl transform transition-all max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Shipment Details</h2>
              <p className="text-gray-600 mt-1">
                Tracking ID: <span className="font-mono text-gray-800">{selectedShipment.trackingId}</span>
              </p>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-grow space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Sender</h3>
                  <div className="space-y-2">
                    <p className="text-base text-gray-700">
                      <span className="font-medium">Name:</span> {selectedShipment.sender.name}
                    </p>
                    <p className="text-base text-gray-700">
                      <span className="font-medium">Address:</span> {selectedShipment.sender.address}
                    </p>
                    <p className="text-base text-gray-700">
                      <span className="font-medium">Phone:</span> {selectedShipment.sender.phone}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Recipient</h3>
                  <div className="space-y-2">
                    <p className="text-base text-gray-700">
                      <span className="font-medium">Name:</span> {selectedShipment.recipient.name}
                    </p>
                    <p className="text-base text-gray-700">
                      <span className="font-medium">Address:</span> {selectedShipment.recipient.address}
                    </p>
                    <p className="text-base text-gray-700">
                      <span className="font-medium">Phone:</span> {selectedShipment.recipient.phone}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Package Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="text-lg font-medium text-gray-900">{selectedShipment.packageInfo.weight} kg</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-lg font-medium text-gray-900">{selectedShipment.packageInfo.type}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Status</p>
                    <StatusBadge status={selectedShipment.status} />
                  </div>
                </div>
              </div>

              {/* Status History Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Status History</h3>
                {selectedShipment.statusHistory && selectedShipment.statusHistory.length > 0 ? (
                  <div className="space-y-4">
                    {selectedShipment.statusHistory.map((history, index) => (
                      <div key={index} className="flex">
                        <div className="flex flex-col items-center mr-4">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          {index !== selectedShipment.statusHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="font-semibold text-gray-800">{history.status}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(history.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {history.notes && (
                            <p className="text-sm text-gray-600 mt-1 italic">\u201C{history.notes}\u201D</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No history available.</div>
                )}
              </div>

              {/* Delivery Proof Section */}
              {(selectedShipment.status === 'Delivered' || selectedShipment.status === 'Failed') && (
                <div className="mt-8">
                  {selectedShipment.status === 'Delivered' && selectedShipment.deliveryProof && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Delivery Proof</h3>
                      {selectedShipment.deliveryProof.type === 'photo' ? (
                        <div>
                          <p className="text-sm text-green-700 mb-3 font-medium">Photo Proof:</p>
                          <img src={selectedShipment.deliveryProof.url} alt="Delivery proof" className="max-w-full max-h-96 rounded-lg border border-green-300" />
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-green-700 mb-3 font-medium">Signature Proof:</p>
                          <img src={selectedShipment.deliveryProof.url} alt="Signature" className="max-w-xs max-h-48 rounded-lg border border-green-300" />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedShipment.status === 'Failed' && selectedShipment.failureReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-900 mb-3">Delivery Failed</h3>
                      <div className="bg-white rounded p-3 border border-red-100">
                        <p className="text-sm text-red-700"><strong>Reason:</strong> {selectedShipment.failureReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}