// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Search, ChevronDown, Building, Package as PackageIcon } from 'lucide-react';

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
  }, [shipments, searchQuery, statusFilter]);

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
        toast.success(`Shipment ${selectedShipment.trackingId} updated to ${statusToUpdate}`, { id: toastId });        
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
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shipment Management</h1>
        <p className="text-gray-600 mt-2">Create, track, and manage all shipments for your branch.</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
        </div>

        {/* Filters and Button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 w-full md:w-48 pl-4 pr-10 text-base bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
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
            <div className="absolute right-0 top-0 h-full pr-3 flex items-center pointer-events-none">
                <ChevronDown size={20} className="text-gray-400" />
            </div>
          </div>
          
          <button 
            onClick={() => openModal('create')} 
            className="flex items-center gap-2 h-12 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            <Plus size={20} /> 
            <span className="hidden sm:inline">Add New Shipment</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="table-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                <td colSpan={7} className="table-cell text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                    <p className="text-gray-600">Loading shipments...</p>
                  </div>
                </td>
              </tr>
            ) : filteredShipments.length > 0 ? (
              filteredShipments.map((shipment, index) => (
                <tr key={shipment._id} className="table-row">
                  <td className="table-cell font-medium">{index + 1}</td>
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
                      <Eye size={18}/>
                    </button>
                    <button 
                      onClick={() => openModal('update', shipment)} 
                      className="p-2 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                      title="Update Status/Assign"
                    >
                      <Edit size={18}/>
                    </button>
                    <button 
                      onClick={() => openModal('delete', shipment)} 
                      className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      title="Cancel Shipment"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="table-cell text-center py-12">
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
      </div>

      {/* CREATE MODAL */}
      {modalType === 'create' && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 transform transition-all">
            <form onSubmit={handleCreateShipment}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Create New Shipment</h2>
                <p className="text-sm text-gray-600 mt-1">Enter sender, recipient, and package details below.</p>
              </div>
              
              <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
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
                        className="form-input text-sm py-2" 
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
                        className="form-input text-sm py-2" 
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
                        className="form-input text-sm py-2" 
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
                        className="form-input text-sm py-2" 
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
                        className="form-input text-sm py-2" 
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
                        className="form-input text-sm py-2" 
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
                          : '🚚 Inter-Branch Transfer: This package will be sent to ' + (branches.find(b => b._id === destinationBranchId)?.name || 'the destination') + '. It will require a manifest dispatch.'
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
                        className="form-select text-sm py-2"
                      >
                        <option value="">-- None --</option>
                        {drivers.map(driver => (
                          <option key={driver._id} value={driver._id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end gap-2 px-4 py-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
            <form onSubmit={handleUpdateShipment}>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Update Shipment</h2>
                <p className="text-gray-600 mt-1">
                  Update status or assign a driver for <span className="font-semibold">{selectedShipment.trackingId}</span>.
                </p>
              </div>
              
              <div className="px-6 py-4 space-y-5">
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
                      <h3 className="text-lg font-semibold text-green-900 mb-4">✓ Delivery Proof</h3>
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
                      <h3 className="text-lg font-semibold text-red-900 mb-3">✗ Delivery Failed</h3>
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