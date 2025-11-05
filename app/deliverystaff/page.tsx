// app/deliverystaff/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { MapPin, Phone, Truck, CheckCircle, XCircle, Package, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface IAddress {
  name: string;
  address: string;
  phone: string;
}

interface IShipment {
  _id: string;
  trackingId: string;
  recipient: IAddress;
  status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed';
  packageInfo: {
    type: string;
    details?: string;
  };
}

export default function DeliveryStaffPage() {
  const { user } = useUser();
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignedShipments = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/shipments?assignedTo=${user?.id}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch assigned shipments');
        const data = await res.json();
        setShipments(data);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchAssignedShipments();
    }
  }, [user]);

  const handleStatusUpdate = async (shipmentId: string, newStatus: IShipment['status'], failureReason?: string) => {
    setUpdatingShipment(shipmentId);
    const toastId = toast.loading('Updating delivery status...');
    
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus,
          ...(failureReason && { failureReason })
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update status');
      }
      
      const updatedShipment = await response.json();
      
      // Update the local state
      setShipments(prev => prev.map(shipment => 
        shipment._id === shipmentId ? updatedShipment : shipment
      ));
      
      toast.success('Delivery status updated successfully!', { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setUpdatingShipment(null);
    }
  };

  const handleGetDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const handleCallCustomer = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'Pending': 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
      'Assigned': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
      'Out for Delivery': 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
      'Delivered': 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
      'Failed': 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-sm text-gray-600 mt-1">View and manage your assigned deliveries</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-sm font-medium text-gray-700">Loading your deliveries...</p>
          </div>
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-300" strokeWidth={1.5} />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No deliveries assigned</h3>
          <p className="mt-2 text-sm text-gray-600">You don't have any deliveries assigned to you at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {shipments.map((shipment) => (
            <div key={shipment._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{shipment.recipient.name}</h3>
                      {getStatusBadge(shipment.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Tracking ID</p>
                        <p className="font-mono text-sm text-gray-900">{shipment.trackingId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Package</p>
                        <p className="text-sm text-gray-900">{shipment.packageInfo.type}{shipment.packageInfo.details ? ` - ${shipment.packageInfo.details}` : ''}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
                        <p className="text-sm text-gray-900">{shipment.recipient.address}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleGetDirections(shipment.recipient.address)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <MapPin size={16} />
                      <span>Directions</span>
                    </button>
                    <button
                      onClick={() => handleCallCustomer(shipment.recipient.phone)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <Phone size={16} />
                      <span>Call</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {(shipment.status === 'Pending' || shipment.status === 'Assigned') && (
                    <button
                      onClick={() => handleStatusUpdate(shipment._id, 'Out for Delivery')}
                      disabled={updatingShipment === shipment._id}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    >
                      <Truck size={16} />
                      <span>Out for Delivery</span>
                      {updatingShipment === shipment._id && (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                    </button>
                  )}
                  
                  {shipment.status === 'Out for Delivery' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(shipment._id, 'Delivered')}
                        disabled={updatingShipment === shipment._id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                      >
                        <CheckCircle size={16} />
                        <span>Delivered</span>
                        {updatingShipment === shipment._id && (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Please enter the reason for delivery failure:');
                          if (reason) {
                            handleStatusUpdate(shipment._id, 'Failed', reason);
                          }
                        }}
                        disabled={updatingShipment === shipment._id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
                      >
                        <XCircle size={16} />
                        <span>Failed</span>
                        {updatingShipment === shipment._id && (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}