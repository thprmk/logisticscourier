// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, Package as PackageIcon, Trash2, UserPlus, X, Calendar } from 'lucide-react';
import { ModernTable, StatusBadge, ActionButtons, Column } from '../components/TableComponents';

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
    details?: string;
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
  const [packageDetails, setPackageDetails] = useState(''); // New state
  const [assignedStaff, setAssignedStaff] = useState(''); // New state for staff assignment
  const [originBranchId, setOriginBranchId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');

  // State for the update form
  const [updateStatus, setUpdateStatus] = useState<IShipment['status']>('At Origin Branch');
  const [updateAssignedTo, setUpdateAssignedTo] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');

  // Date Range Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk actions state
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(new Set());
  const [bulkAssignStaffId, setBulkAssignStaffId] = useState('');
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

    // Apply staff filter
    if (staffFilter) {
      filtered = filtered.filter(shipment => shipment.assignedTo?._id === staffFilter);
    }

    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(shipment => {
        const shipmentDate = new Date(shipment.createdAt);
        shipmentDate.setHours(0, 0, 0, 0);

        let isValid = true;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          isValid = isValid && shipmentDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          isValid = isValid && shipmentDate <= end;
        }
        return isValid;
      });
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
  }, [shipments, searchQuery, statusFilter, staffFilter, startDate, endDate]);

  const resetForms = () => {
    setSenderName(''); setSenderAddress(''); setSenderPhone('');
    setRecipientName(''); setRecipientAddress(''); setRecipientPhone('');
    setPackageWeight(1); setPackageType('Parcel'); setPackageDetails('');
    setAssignedStaff(''); // Reset assigned staff
    setDestinationBranchId(''); // Reset destination, but keep origin
    setOriginBranchId(user?.tenantId || '');
    setUpdateStatus('At Origin Branch'); setUpdateAssignedTo(''); setUpdateNotes('');
    setSelectedShipment(null);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const paginatedShipments = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredShipments.slice(startIdx, endIdx);
  }, [filteredShipments, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedShipmentIds(new Set()); // Clear selections when filters change
  }, [searchQuery, statusFilter, staffFilter, startDate, endDate]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Bulk actions handlers
  const toggleSelectShipment = (shipmentId: string) => {
    const newSelected = new Set(selectedShipmentIds);
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId);
    } else {
      newSelected.add(shipmentId);
    }
    setSelectedShipmentIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedShipmentIds.size === paginatedShipments.length) {
      setSelectedShipmentIds(new Set());
    } else {
      setSelectedShipmentIds(new Set(paginatedShipments.map(s => s._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedShipmentIds.size === 0) return;
    const confirmDelete = window.confirm(`Delete ${selectedShipmentIds.size} shipment(s)? This action cannot be undone.`);
    if (!confirmDelete) return;

    const toastId = toast.loading(`Deleting ${selectedShipmentIds.size} shipment(s)...`);
    try {
      const deletePromises = Array.from(selectedShipmentIds).map(id =>
        fetch(`/api/shipments/${id}`, { method: 'DELETE', credentials: 'include' })
      );

      const results = await Promise.all(deletePromises);
      const allSuccess = results.every(r => r.ok);

      if (!allSuccess) throw new Error('Some shipments failed to delete');

      toast.success(`Deleted ${selectedShipmentIds.size} shipment(s)`, { id: toastId });
      setSelectedShipmentIds(new Set());
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete shipments', { id: toastId });
    }
  };

  // Validation logic for bulk actions
  const getSelectedShipments = () => {
    return filteredShipments.filter(s => selectedShipmentIds.has(s._id));
  };

  const canAssignSelected = () => {
    const selected = getSelectedShipments();
    if (selected.length === 0) return false;
    // Can only assign shipments at destination branch or in assigned state
    return selected.every(s =>
      s.status === 'At Destination Branch' || s.status === 'Assigned'
    );
  };

  const handleBulkAssign = async () => {
    if (selectedShipmentIds.size === 0 || !bulkAssignStaffId) return;

    const toastId = toast.loading(`Assigning ${selectedShipmentIds.size} shipment(s)...`);
    try {
      const updatePromises = Array.from(selectedShipmentIds).map(id =>
        fetch(`/api/shipments/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTo: bulkAssignStaffId })
        })
      );

      const results = await Promise.all(updatePromises);
      const allSuccess = results.every(r => r.ok);

      if (!allSuccess) throw new Error('Some shipments failed to update');

      toast.success(`Assigned ${selectedShipmentIds.size} shipment(s)`, { id: toastId });
      setSelectedShipmentIds(new Set());
      setShowBulkAssignModal(false);
      setBulkAssignStaffId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign shipments', { id: toastId });
    }
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
      packageInfo: { weight: packageWeight, type: packageType, details: packageDetails },
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

  // Columns configuration for the ModernTable
  const columns: Column<IShipment>[] = [
    {
      header: 'S/No',
      cell: (item) => {
        const index = paginatedShipments.findIndex(s => s._id === item._id);
        return <span className="text-gray-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</span>;
      },
      className: 'w-16'
    },
    {
      header: 'Tracking ID',
      accessorKey: 'trackingId',
      cell: (item) => <span className="font-mono text-blue-700 font-bold text-base">{item.trackingId}</span>
    },
    {
      header: 'Recipient',
      cell: (item) => (
        <div>
          <div className="font-bold text-gray-900 text-base">{item.recipient.name}</div>
          <div className="text-gray-500 text-sm mt-0.5">{item.recipient.address}</div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (item) => <StatusBadge status={item.status} />
    },
    {
      header: 'Assigned To',
      cell: (item) => (
        <span className={`font-medium ${item.assignedTo ? 'text-gray-900' : 'text-gray-400 italic'}`}>
          {item.assignedTo?.name || 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Date',
      cell: (item) => (
        <span className="text-gray-600 font-medium">
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (item) => (
        <ActionButtons
          onView={() => openModal('view', item)}
          onEdit={() => openModal('update', item)}
          onDelete={() => openModal('delete', item)}
        />
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Shipment Management</h1>
          <p className="text-base text-gray-500 mt-1">Create, track, and manage all shipments for your branch.</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
        >
          <Plus size={20} />
          <span>New Shipment</span>
        </button>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 items-center">
          {/* Search - Compact */}
          <div className="relative w-full xl:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by tracking ID, name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          {/* Inline Filters */}
          <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto xl:flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full md:w-48 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50"
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

            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="block w-full md:w-48 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50"
            >
              <option value="">All Staff</option>
              {drivers.map(driver => (
                <option key={driver._id} value={driver._id}>
                  {driver.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full md:w-40 pl-3 pr-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50"
                  placeholder="Start Date"
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full md:w-40 pl-3 pr-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50"
                  placeholder="End Date"
                />
              </div>
            </div>
          </div>

          {/* Bulk Actions Indicator */}
          {selectedShipmentIds.size > 0 && (
            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 animate-in fade-in whitespace-nowrap">
              <span className="text-sm font-semibold text-blue-900">
                {selectedShipmentIds.size} selected
              </span>
              <div className="h-4 w-px bg-blue-200"></div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => canAssignSelected() && setShowBulkAssignModal(true)}
                  disabled={!canAssignSelected()}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wide rounded transition-colors ${canAssignSelected()
                    ? 'text-blue-700 hover:bg-blue-100'
                    : 'text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Assign
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wide text-red-700 hover:bg-red-100 rounded transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedShipmentIds(new Set())}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <ModernTable
        data={paginatedShipments}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No shipments found matching your criteria."
        keyField="_id"
        selectedIds={selectedShipmentIds}
        onSelect={toggleSelectShipment}
        onSelectAll={toggleSelectAll}
        onRowClick={(item) => openModal('view', item)}
      />

      {/* Pagination */}
      {paginatedShipments.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-5">
          <div className="text-sm text-gray-500">
            Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredShipments.length)}</span> of <span className="font-bold text-gray-900">{filteredShipments.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 text-sm font-medium rounded-md ${currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Create Modal */}
      {modalType === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Create New Shipment</h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="p-6 space-y-8">
              {/* Branch Selection */}
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Route Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Origin Branch</label>
                    <input
                      type="text"
                      value={branches.find(b => b._id === originBranchId)?.name || 'Loading...'}
                      disabled
                      className="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Destination Branch <span className="text-red-500">*</span></label>
                    <select
                      value={destinationBranchId}
                      onChange={(e) => setDestinationBranchId(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      required
                    >
                      <option value="">Select Destination</option>
                      {branches.filter(b => b._id !== originBranchId).map(branch => (
                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sender Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Sender Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                    <textarea
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      rows={3}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Recipient Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                    <textarea
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      rows={3}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Logistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(parseFloat(e.target.value))}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Type <span className="text-red-500">*</span></label>
                    <select
                      value={packageType}
                      onChange={(e) => setPackageType(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Parcel">Parcel</option>
                      <option value="Document">Document</option>
                      <option value="Fragile">Fragile</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Perishable">Perishable</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Driver (Optional)</label>
                    <select
                      value={assignedStaff}
                      onChange={(e) => setAssignedStaff(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(driver => (
                        <option key={driver._id} value={driver._id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Description</label>
                  <textarea
                    value={packageDetails}
                    onChange={(e) => setPackageDetails(e.target.value)}
                    rows={2}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Optional details about the package content..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100"
                >
                  {isSubmitting ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {modalType === 'update' && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Update Status</h2>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateShipment} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as IShipment['status'])}
                  className="block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              {updateStatus === 'Assigned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Driver</label>
                  <select
                    value={updateAssignedTo}
                    onChange={(e) => setUpdateAssignedTo(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(driver => (
                      <option key={driver._id} value={driver._id}>{driver.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={3}
                  className="block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add any relevant notes..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100"
                >
                  {isSubmitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === 'delete' && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Delete Shipment?</h3>
              <p className="text-gray-500 mt-2">
                Are you sure you want to delete shipment <span className="font-mono font-bold text-gray-900">{selectedShipment.trackingId}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShipment}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-100"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modalType === 'view' && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Shipment Details</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">{selectedShipment.trackingId}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Status Banner */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Current Status</p>
                  <StatusBadge status={selectedShipment.status} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium mb-1">Created On</p>
                  <p className="text-gray-900 font-bold">
                    {new Date(selectedShipment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sender Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Sender</h3>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{selectedShipment.sender.name}</p>
                    <p className="text-gray-600">{selectedShipment.sender.phone}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{selectedShipment.sender.address}</p>
                  </div>
                </div>

                {/* Recipient Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Recipient</h3>
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900">{selectedShipment.recipient.name}</p>
                    <p className="text-gray-600">{selectedShipment.recipient.phone}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{selectedShipment.recipient.address}</p>
                  </div>
                </div>
              </div>

              {/* Package Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Package Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Type</p>
                    <p className="font-medium text-gray-900">{selectedShipment.packageInfo.type}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Weight</p>
                    <p className="font-medium text-gray-900">{selectedShipment.packageInfo.weight} kg</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Description</p>
                    <p className="font-medium text-gray-900">{selectedShipment.packageInfo.details || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Status History */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">Timeline</h3>
                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-gray-200">
                  {selectedShipment.statusHistory.slice().reverse().map((history, idx) => (
                    <div key={idx} className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600"></div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{history.status}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(history.timestamp).toLocaleString()}
                        </p>
                        {history.notes && (
                          <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                            {history.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Bulk Assign Driver</h2>
              <button onClick={() => setShowBulkAssignModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-600">
                Assigning <span className="font-bold text-gray-900">{selectedShipmentIds.size}</span> shipment(s) to a driver.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Driver</label>
                <select
                  value={bulkAssignStaffId}
                  onChange={(e) => setBulkAssignStaffId(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Driver</option>
                  {drivers.map(driver => (
                    <option key={driver._id} value={driver._id}>{driver.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowBulkAssignModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignStaffId}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100"
                >
                  Assign Drivers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}