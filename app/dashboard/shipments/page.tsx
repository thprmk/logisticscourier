// app/dashboard/shipments/page.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';

// Define TypeScript types for our data
interface IAddress {
  name: string;
  address: string;
  phone: string;
}

interface IPackageInfo {
    weight: number;
    type: string;
    details?: string;
}

interface IShipment {
  _id: string;
  trackingId: string;
  sender: any;
  recipient: any;
  status: string;
  createdAt: string;
      assignedTo?: {
        _id: string;
        name: string;
    }
}

interface IUser {
  _id: string;
  name: string;
}



export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [drivers, setDrivers] = useState<IUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // State for the "Create Shipment" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  
  // State for the new shipment form fields
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [packageWeight, setPackageWeight] = useState(0);
  const [packageType, setPackageType] = useState('Parcel');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');



  // Function to fetch shipments
  const fetchShipments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/shipments');
      if (!response.ok) {
        throw new Error('Failed to fetch shipments');
      }
      const data = await response.json();
      setShipments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };


    // New function to fetch drivers
  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/users?role=staff'); // Fetch only staff
      if (!response.ok) throw new Error('Failed to fetch drivers');
      const data = await response.json();
      setDrivers(data);
    } catch (err) {
      console.error(err); // Log error but don't block UI
    }
  };

  // Fetch shipments when the component mounts
  useEffect(() => {
    fetchShipments();
    fetchDrivers();
  }, []);

  const resetForm = () => {
      setSenderName(''); setSenderAddress(''); setSenderPhone('');
      setRecipientName(''); setRecipientAddress(''); setRecipientPhone('');
      setPackageWeight(0); setPackageType('Parcel');
      setFormError('');
  }

  // Handle form submission
  const handleCreateShipment = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');

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
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to create shipment");
        }
         toast.success('Shipment created successfully!'); // SUCCESS TOAST
        // Success
        setIsModalOpen(false); // Close the modal
        resetForm();
        fetchShipments(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
        setFormError(err.message);
    }
  };

    // New function to open the assignment modal
  const openAssignModal = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setSelectedDriverId(drivers[0]?._id || ''); // Pre-select the first driver
    setIsAssignModalOpen(true);
  };


   // New function to handle the assignment logic
  const handleAssignShipment = async (event: FormEvent) => {
      event.preventDefault();
      if (!selectedShipmentId || !selectedDriverId) return;

      try {
          const response = await fetch(`/api/shipments/${selectedShipmentId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ driverId: selectedDriverId }),
          });
          if (!response.ok) {
              const data = await response.json();
              throw new Error(data.message || 'Failed to assign shipment');
          }
          // Success
          setIsAssignModalOpen(false);
          fetchShipments(); // Refresh the list to show the new status
      } catch (err: any) {
          alert(err.message); // Simple error feedback for now
      }
  };


  if (isLoading) return <div className="p-8">Loading shipments...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shipment Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow"
        >
          Create New Shipment
        </button>
      </header>
      
      {/* Shipments Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-4">Tracking ID</th>
              <th className="text-left py-3 px-4">Recipient</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Assigned To</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-mono">{shipment.trackingId}</td>
                <td className="py-3 px-4">{shipment.recipient.name}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      shipment.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : 
                      shipment.status === 'Delivered' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {shipment.status}
                  </span>
                </td>
                <td className="py-3 px-4">{shipment.assignedTo?.name || 'N/A'}</td>
                <td className="py-3 px-4">
                    {shipment.status ==='Pending' && (
                        <button
                            onClick={() => openAssignModal(shipment._id)}
                            className="text-blue-600 hover:underline"
                        
                        >
                            Assign?
                        </button>

                    )}
                </td>
              </tr>
            ))}
             {shipments.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8">No shipments found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Shipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">New Shipment Details</h2>
            <form onSubmit={handleCreateShipment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sender Details */}
                <fieldset className="border p-4 rounded-md">
                  <legend className="font-semibold px-2">Sender</legend>
                  <input type="text" placeholder="Name" value={senderName} onChange={(e) => setSenderName(e.target.value)} className="w-full p-2 border rounded mb-2" required />
                  <input type="text" placeholder="Address" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} className="w-full p-2 border rounded mb-2" required />
                  <input type="tel" placeholder="Phone" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className="w-full p-2 border rounded" required />
                </fieldset>
                
                {/* Recipient Details */}
                <fieldset className="border p-4 rounded-md">
                  <legend className="font-semibold px-2">Recipient</legend>
                  <input type="text" placeholder="Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full p-2 border rounded mb-2" required />
                  <input type="text" placeholder="Address" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} className="w-full p-2 border rounded mb-2" required />
                  <input type="tel" placeholder="Phone" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="w-full p-2 border rounded" required />
                </fieldset>
              </div>

              {/* Package Details */}
              <fieldset className="border p-4 rounded-md mt-6">
                 <legend className="font-semibold px-2">Package</legend>
                 <div className="flex gap-4">
                    <input type="number" placeholder="Weight (kg)" value={packageWeight} onChange={(e) => setPackageWeight(parseFloat(e.target.value))} className="w-full p-2 border rounded" required />
                    <select value={packageType} onChange={(e) => setPackageType(e.target.value)} className="w-full p-2 border rounded">
                        <option>Parcel</option>
                        <option>Document</option>
                        <option>Fragile</option>
                    </select>
                 </div>
              </fieldset>

              {formError && <p className="text-red-500 text-sm text-center mt-4">{formError}</p>}

              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Save Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

         {/* NEW: Assign Shipment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Assign Shipment</h2>
            <form onSubmit={handleAssignShipment}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Select Driver</label>
                <select 
                  value={selectedDriverId} 
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {drivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>{driver.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-4 mt-8">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}