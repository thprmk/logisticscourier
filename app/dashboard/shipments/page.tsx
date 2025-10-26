// app/dashboard/shipments/page.tsx
"use client";
import { useState, useEffect, FormEvent, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Search, ChevronDown } from 'lucide-react';

// Define TypeScript interfaces for our data
interface IAddress {
  name: string;
  address: string;
  phone: string;
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
  status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed';
  assignedTo?: {
      _id: string;
      name: string;
  }
  statusHistory: IStatusHistory[];
  createdAt: string;
}

interface IUser {
  _id: string;
  name: string;
}

// Define the type for our modals for cleaner state management
type ModalType = 'create' | 'update' | 'delete' | 'view' | null;

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [drivers, setDrivers] = useState<IUser[]>([]);
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

  // State for the update form
  const [updateStatus, setUpdateStatus] = useState<IShipment['status']>('Pending');
  const [updateAssignedTo, setUpdateAssignedTo] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

   const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch shipments and drivers in parallel
      const [shipmentsRes, driversRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/users?role=staff') // Assuming 'staff' are drivers
      ]);

      if (!shipmentsRes.ok) throw new Error('Failed to fetch shipments');
      if (!driversRes.ok) throw new Error('Failed to fetch drivers');

      const shipmentsData = await shipmentsRes.json();
      const driversData = await driversRes.json();

      setShipments(shipmentsData);
      setDrivers(driversData);

    } catch (err: any) {
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
    setUpdateStatus('Pending'); setUpdateAssignedTo(''); setUpdateNotes('');
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
    }
  };

  const closeModal = () => {
    setModalType(null);
    resetForms();
  };

  //CRUD Handlers 

  const handleCreateShipment = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Creating new shipment...');

    const newShipmentData = {
        sender: { name: senderName, address: senderAddress, phone: senderPhone },
        recipient: { name: recipientName, address: recipientAddress, phone: recipientPhone },
        packageInfo: { weight: packageWeight, type: packageType }
    };
    
    try {
        const response = await fetch('/api/shipments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newShipmentData)
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to create shipment");
        }
        toast.success('Shipment created successfully!', { id: toastId });
        closeModal();
        fetchData(); // Refresh all data
    } catch (err: any) {
        toast.error(err.message, { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleUpdateShipment = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedShipment) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Updating shipment...`);

    const updatePayload = {
      status: updateStatus,
      assignedTo: updateAssignedTo || null,
      notes: updateNotes
    };

    try {
        const res = await fetch(`/api/shipments/${selectedShipment._id}`, {
            method: 'PATCH', // Use PATCH for partial updates
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
        toast.success(`Shipment updated successfully.`, { id: toastId });        
        closeModal();
        fetchData();
    } catch (error: any) {
        toast.error(error.message, { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteShipment = async () => {
    if (!selectedShipment) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Cancelling shipment...`);
    try {
        const res = await fetch(`/api/shipments/${selectedShipment._id}`, { method: 'DELETE' });
        if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
        toast.success(`Shipment ${selectedShipment.trackingId} cancelled.`, { id: toastId });
        closeModal();
        fetchData();
    } catch (error: any) {
        toast.error(error.message, { id: toastId });
    } finally { 
        setIsSubmitting(false);
    }
  };
  
  // Helper to render status badges
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: { [key: string]: string } = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Assigned': 'bg-blue-100 text-blue-800',
        'Out for Delivery': 'bg-indigo-100 text-indigo-800',
        'Delivered': 'bg-green-100 text-green-800',
        'Failed': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
  };
  
  return (
    <div>
 <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Shipment Management</h1>
          <p className="text-gray-500 mt-1">Create, track, and manage all shipments for your branch.</p>
      </div>

      {/* 2. The New Action Bar with the desired layout */}
      <div className="flex items-center justify-between mb-4">
        {/* Left Side: Search Bar */}
        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Right Side: Group for Dropdown and Button */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full sm:w-auto pl-3 pr-8 text-sm bg-white border border-gray-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
            </select>
            <div className="absolute right-0 top-0 h-full pr-2 flex items-center pointer-events-none">
                <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
          
          <button onClick={() => openModal('create')} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors h-10">
            <Plus size={18} /> Add New Shipment
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
    {/* **** ATTENTION: THE FIX IS IN THIS BLOCK **** */}
         <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              // CHANGE 2: Updated colSpan from 6 to 7
              <tr><td colSpan={7} className="text-center py-10 text-gray-500">Loading shipments...</td></tr>
            ) : filteredShipments.length > 0 ? (
              filteredShipments.map((shipment, index) => ( // Added 'index' to the map function
                <tr key={shipment._id} className="hover:bg-gray-50">
                  
                  {/* CHANGE 3: Added a new table cell to display the index */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{shipment.trackingId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{shipment.recipient.name}</div>
                    <div className="text-sm text-gray-500">{shipment.recipient.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={shipment.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{shipment.assignedTo?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(shipment.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    <button onClick={() => openModal('view', shipment)} className="text-gray-400 hover:text-blue-600" title="View Details"><Eye size={18}/></button>
                    <button onClick={() => openModal('update', shipment)} className="text-gray-400 hover:text-indigo-600" title="Update Status/Assign"><Edit size={18}/></button>
                    <button onClick={() => openModal('delete', shipment)} className="text-gray-400 hover:text-red-600" title="Cancel Shipment"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                {/* CHANGE 4: Updated colSpan from 6 to 7 */}
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  {shipments.length > 0 ? "No shipments match your filters." : "No shipments have been created yet."}
                </td>
              </tr>
            )}
          </tbody>
     
        </table>
      </div>
      

      {/* CREATE MODAL */}
      {modalType === 'create' && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all">
            <form onSubmit={handleCreateShipment}>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900">Create New Shipment</h2>
                <p className="text-sm text-gray-500 mt-1">Enter sender, recipient, and package details below.</p>
              </div>
              
              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <fieldset>
                  <legend className="text-base font-medium text-gray-900 mb-2">Sender Details</legend>
                  <div className="space-y-4">
                    <input type="text" placeholder="Full Name" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
                    <input type="text" placeholder="Full Address" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
                    <input type="tel" placeholder="Phone Number" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
                  </div>
                </fieldset>
                
                <fieldset>
                  <legend className="text-base font-medium text-gray-900 mb-2">Recipient Details</legend>
                  <div className="space-y-4">
                    <input type="text" placeholder="Full Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
                    <input type="text" placeholder="Full Address" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
                    <input type="tel" placeholder="Phone Number" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required />
                  </div>
                </fieldset>
                
                <fieldset className="md:col-span-2">
                  <legend className="text-base font-medium text-gray-900 mb-2">Package Details</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <input type="number" placeholder="Weight (kg)" value={packageWeight} onChange={(e) => setPackageWeight(parseFloat(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" required min="0.1" step="0.1" />
                    <select value={packageType} onChange={(e) => setPackageType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        <option>Parcel</option>
                        <option>Document</option>
                        <option>Fragile</option>
                    </select>
                  </div>
                </fieldset>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md shadow-sm hover:bg-gray-900 disabled:bg-gray-400">{isSubmitting ? 'Saving...' : 'Save Shipment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {modalType === 'update' && selectedShipment && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
            <form onSubmit={handleUpdateShipment}>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900">Update Shipment</h2>
                <p className="text-sm text-gray-500 mt-1">Update status or assign a driver for <span className="font-medium">{selectedShipment.trackingId}</span>.</p>
              </div>
              
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value as IShipment['status'])} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm">
                      <option>Pending</option>
                      <option>Assigned</option>
                      <option>Out for Delivery</option>
                      <option>Delivered</option>
                      <option>Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assign to Driver</label>
                  <select value={updateAssignedTo} onChange={(e) => setUpdateAssignedTo(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm">
                      <option value="">-- Unassigned --</option>
                      {drivers.map(driver => <option key={driver._id} value={driver._id}>{driver.name}</option>)}
                  </select>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                  <textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} rows={3} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Reason for delivery failure"></textarea>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md shadow-sm hover:bg-gray-900 disabled:bg-gray-400">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {modalType === 'delete' && selectedShipment && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
            <div className="p-6 flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-4 text-left">
                  <h2 className="text-xl font-semibold text-gray-900">Cancel Shipment</h2>
                  <p className="text-sm text-gray-500 mt-1">Are you sure you want to cancel shipment <strong className="font-semibold">{selectedShipment.trackingId}</strong>? This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">No, Keep It</button>
                <button onClick={handleDeleteShipment} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-400">{isSubmitting ? 'Cancelling...' : 'Yes, Cancel'}</button>
            </div>
          </div>
        </div>
      )}

       {/* VIEW MODAL */}
      {modalType === 'view' && selectedShipment && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          {/* Added max-h-[90vh] and flex display for better scrolling on small screens */}
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl transform transition-all max-h-[90vh] flex flex-col">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900">Shipment Details</h2>
                <p className="text-sm text-gray-500 mt-1">Tracking ID: <span className="font-mono text-gray-800">{selectedShipment.trackingId}</span></p>
              </div>

              {/* Added overflow-y-auto to make the content scrollable */}
              <div className="px-6 pb-6  overflow-y-auto">
                  {/* Sender & Recipient Info (Unchanged structurally, just minor styling) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                      <div>
                          <h3 className="text-base font-semibold text-gray-800 mb-2">Sender</h3>
                          <p className="text-sm text-gray-600">{selectedShipment.sender.name}</p>
                          <p className="text-sm text-gray-600">{selectedShipment.sender.address}</p>
                          <p className="text-sm text-gray-600">{selectedShipment.sender.phone}</p>
                      </div>
                      <div>
                          <h3 className="text-base font-semibold text-gray-800 mb-2">Recipient</h3>
                          <p className="text-sm text-gray-600">{selectedShipment.recipient.name}</p>
                          <p className="text-sm text-gray-600">{selectedShipment.recipient.address}</p>
                          <p className="text-sm text-gray-600">{selectedShipment.recipient.phone}</p>
                      </div>
                  </div>

                  {/* --- NEW: Status History Timeline --- */}
                  <div className="mt-8">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Status History</h3>
                    {/* This is the main timeline container */}
                    <div className="space-y-6 border-l-2 border-gray-200 ml-2">
                        {selectedShipment.statusHistory && selectedShipment.statusHistory.length > 0 ? (
                            selectedShipment.statusHistory.map((history, index) => (
                                <div key={index} className="relative">
                                    {/* The timeline dot */}
                                    <div className="absolute -left-[11px] h-5 w-5 bg-gray-200 rounded-full border-4 border-white"></div>
                                    {/* The content for each history item */}
                                    <div className="ml-8">
                                        <p className="font-semibold text-gray-800">{history.status}</p>
                                        <p className="text-xs text-gray-500">{new Date(history.timestamp).toLocaleString()}</p>
                                        {/* Conditionally render notes if they exist */}
                                        {history.notes && <p className="text-sm text-gray-600 mt-1 italic">"{history.notes}"</p>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="ml-8 text-sm text-gray-500">No history available.</div>
                        )}
                    </div>
                  </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg ">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md shadow-sm hover:bg-gray-900">Close</button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}