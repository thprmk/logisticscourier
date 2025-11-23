// app/deliverystaff/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { MapPin, Phone, Truck, CheckCircle, XCircle, Package, Building, Eye } from 'lucide-react';
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
  status: 'At Origin Branch' | 'In Transit to Destination' | 'At Destination Branch' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed';
  packageInfo: {
    type: string;
    details?: string;
  };
  deliveryProof?: {
    type: 'signature' | 'photo';
    url: string;  // Vercel Blob URL
  };
  failureReason?: string;
}

export default function DeliveryStaffPage() {
  const { user } = useUser();
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'signature' | 'photo'>('signature');
  const [showFailureModal, setShowFailureModal] = useState<string | null>(null);
  const [selectedFailureReason, setSelectedFailureReason] = useState<string>('');

  const failureReasons = [
    'Customer Not Available',
    'Address Incorrect / Incomplete',
    'Customer Refused Delivery',
    'Package Damaged',
    'Wrong Item',
    'Other',
  ];

  useEffect(() => {
    const fetchAssignedShipments = async () => {
      setIsLoading(true);
      try {
        if (!user?.id) {
          console.warn('User ID not available');
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching shipments for user ID:', user.id);
        const res = await fetch(`/api/shipments?assignedTo=${user.id}`, {
          credentials: 'include',
        });
        
        console.log('Shipments fetch response status:', res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch assigned shipments');
        }
        
        const data = await res.json();
        console.log('Fetched shipments:', data);
        setShipments(data);
      } catch (error: any) {
        console.error('Error fetching shipments:', error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchAssignedShipments();
      // Auto-refresh every 10 seconds, but ONLY if no modal is open
      const interval = setInterval(() => {
        if (!showProofModal && !showFailureModal) {
          fetchAssignedShipments();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user, showProofModal, showFailureModal]);

  const handleStatusUpdate = async (shipmentId: string, newStatus: IShipment['status'], failureReason?: string, deliveryProof?: { type: 'signature' | 'photo'; url: string }) => {
    setUpdatingShipment(shipmentId);
    const toastId = toast.loading('Updating delivery status...');
    
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus,
          ...(failureReason && { failureReason }),
          ...(deliveryProof && { deliveryProof })
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update status');
      }
      
      const updatedShipment = await response.json();
      
      // Update the local state with fresh data
      setShipments(prev => prev.map(shipment => 
        shipment._id === shipmentId ? updatedShipment : shipment
      ));
      
      // Also fetch fresh data immediately to ensure UI shows proof
      try {
        const freshRes = await fetch(`/api/shipments/${shipmentId}`, { credentials: 'include' });
        if (freshRes.ok) {
          const freshShipment = await freshRes.json();
          setShipments(prev => prev.map(s => s._id === shipmentId ? freshShipment : s));
        }
      } catch (error) {
        console.error('Error fetching fresh shipment data:', error);
      }
      
      // Close modals immediately
      setShowProofModal(null);
      setShowFailureModal(null);
      setSelectedFailureReason('');
      setProofType('signature');
      
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
      'At Origin Branch': 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
      'In Transit to Destination': 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
      'At Destination Branch': 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
      'Assigned': 'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-600/20',
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
                  {(shipment.status === 'Assigned') && (
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
                        onClick={() => setShowProofModal(shipment._id)}
                        disabled={updatingShipment === shipment._id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                      >
                        <CheckCircle size={16} />
                        <span>Mark as Delivered</span>
                        {updatingShipment === shipment._id && (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setShowFailureModal(shipment._id)}
                        disabled={updatingShipment === shipment._id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
                      >
                        <XCircle size={16} />
                        <span>Delivery Failed</span>
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

                {/* Delivery Details Section - Show proof and failure info */}
                {(shipment.status === 'Delivered' || shipment.status === 'Failed') && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {shipment.status === 'Delivered' && shipment.deliveryProof && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-green-900 mb-3">✓ Delivery Proof</h4>
                        {shipment.deliveryProof.type === 'photo' ? (
                          <div>
                            <p className="text-xs text-green-700 mb-2">Photo:</p>
                            <img src={shipment.deliveryProof.url} alt="Delivery proof" className="max-h-48 rounded-lg border border-green-200" />
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-green-700 mb-2">Signature:</p>
                            <img src={shipment.deliveryProof.url} alt="Signature" className="max-h-32 rounded-lg border border-green-200" />
                          </div>
                        )}
                      </div>
                    )}

                    {shipment.status === 'Failed' && shipment.failureReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-red-900 mb-2">✗ Delivery Failed</h4>
                        <p className="text-sm text-red-700"><strong>Reason:</strong> {shipment.failureReason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Proof of Delivery Modal */}
                {showProofModal === shipment._id && (
                  <ProofOfDeliveryModal
                    shipmentId={shipment._id}
                    onSubmit={(proof) => handleStatusUpdate(shipment._id, 'Delivered', undefined, proof as any)}
                    onClose={() => setShowProofModal(null)}
                    isSubmitting={updatingShipment === shipment._id}
                  />
                )}

                {/* Failure Reason Modal */}
                {showFailureModal === shipment._id && (
                  <FailureReasonModal
                    shipmentId={shipment._id}
                    reasons={failureReasons}
                    onSubmit={(reason) => handleStatusUpdate(shipment._id, 'Failed', reason)}
                    onClose={() => setShowFailureModal(null)}
                    isSubmitting={updatingShipment === shipment._id}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Proof of Delivery Modal Component
function ProofOfDeliveryModal({
  shipmentId,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  shipmentId: string;
  onSubmit: (proof: { type: 'signature' | 'photo'; url: string }) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [proofType, setProofType] = useState<'signature' | 'photo'>('signature');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('shipmentId', shipmentId);
        formData.append('proofType', proofType);

        const res = await fetch('/api/delivery/upload-proof', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!res.ok) {
          const error = await res.json();
          toast.error(error.message || 'Failed to upload photo');
          return;
        }

        const data = await res.json();
        setProofUrl(data.url);
        toast.success('Photo uploaded successfully!');
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error('Failed to upload photo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = () => {
    if (!proofUrl) {
      toast.error(`Please provide ${proofType === 'signature' ? 'a signature' : 'a photo'}`);
      return;
    }
    onSubmit({
      type: proofType,
      url: proofUrl,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Proof of Delivery</h2>
          <p className="text-sm text-gray-600 mt-1">Capture signature or photo</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Proof Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="signature"
                  checked={proofType === 'signature'}
                  onChange={(e) => {
                    setProofType(e.target.value as 'signature' | 'photo');
                    setProofUrl('');
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Signature</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="photo"
                  checked={proofType === 'photo'}
                  onChange={(e) => {
                    setProofType(e.target.value as 'signature' | 'photo');
                    setProofUrl('');
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Photo</span>
              </label>
            </div>
          </div>

          {proofType === 'photo' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {isUploading && (
                <div className="mt-3 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-xs text-gray-600 mt-2">Uploading photo...</p>
                </div>
              )}
              {proofUrl && !isUploading && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-green-600 mb-3 font-medium">✓ Photo uploaded successfully</p>
                  <div className="relative">
                    <img 
                      src={proofUrl} 
                      alt="Delivery proof" 
                      className="w-full h-auto max-h-64 object-cover rounded-lg border border-gray-300 shadow-sm" 
                      onError={(e) => {
                        console.error('Image failed to load:', proofUrl);
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22sans-serif%22 font-size=%2220%22 fill=%22%23999%22%3EImage failed to load%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature</label>
              <p className="text-xs text-gray-500 mb-2">Note: Signature capture is a placeholder. In production, use a signature pad library.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Customer to sign here</p>
                <button
                  type="button"
                  onClick={() => {
                    // Placeholder: In real app, integrate with a signature pad library
                    setProofUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                    toast.success('Signature captured (placeholder)');
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {proofUrl ? '✓ Signature Captured' : 'Confirm Signature'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || !proofUrl}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Failure Reason Modal Component
function FailureReasonModal({
  shipmentId,
  reasons,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  shipmentId: string;
  reasons: string[];
  onSubmit: (reason: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');

  const handleSubmit = () => {
    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;
    if (!finalReason) {
      toast.error('Please select or enter a reason');
      return;
    }
    onSubmit(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Delivery Failed</h2>
          <p className="text-sm text-gray-600 mt-1">Please select a reason</p>
        </div>

        <div className="p-6 space-y-3">
          {reasons.map((reason) => (
            <label key={reason} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}

          {selectedReason === 'Other' && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Please explain..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Failure'}
          </button>
        </div>
      </div>
    </div>
  );
}