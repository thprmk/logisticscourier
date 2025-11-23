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
  const [proofImageViewer, setProofImageViewer] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your assigned deliveries</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-300 mb-3" strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-gray-900">No deliveries</h3>
            <p className="text-sm text-gray-500 mt-1">You don't have any deliveries assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => {
              const isDelivered = shipment.status === 'Delivered';
              const isFailed = shipment.status === 'Failed';
              const isOutForDelivery = shipment.status === 'Out for Delivery';
              const isAssigned = shipment.status === 'Assigned';
              
              return (
              <div key={shipment._id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 border-b border-gray-100 gap-2 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{shipment.recipient.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{shipment.trackingId}</p>
                  </div>
                  <div className="self-start sm:self-auto">
                    {getStatusBadge(shipment.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="px-3 sm:px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-500 block">Package</span>
                    <span className="text-gray-900 font-medium">{shipment.packageInfo.type}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Phone</span>
                    <span className="text-gray-900">{shipment.recipient.phone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-gray-500 block">Address</span>
                    <span className="text-gray-900 text-sm">{shipment.recipient.address}</span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="px-3 sm:px-4 py-3 bg-gray-50 flex gap-2">
                  <button
                    onClick={() => handleGetDirections(shipment.recipient.address)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    <MapPin size={14} className="flex-shrink-0" />
                    <span className="sm:inline">Directions</span>
                  </button>
                  <button
                    onClick={() => handleCallCustomer(shipment.recipient.phone)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    <Phone size={14} className="flex-shrink-0" />
                    <span>Call</span>
                  </button>
                </div>

                {/* Status Action Buttons */}
                {(isAssigned || isOutForDelivery) && (
                  <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                    {isAssigned && (
                      <button
                        onClick={() => handleStatusUpdate(shipment._id, 'Out for Delivery')}
                        disabled={updatingShipment === shipment._id}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                      >
                        <Truck size={16} className="flex-shrink-0" />
                        {updatingShipment === shipment._id ? 'Starting...' : 'Start Delivery'}
                      </button>
                    )}

                    {isOutForDelivery && (
                      <>
                        <button
                          onClick={() => setShowProofModal(shipment._id)}
                          disabled={updatingShipment === shipment._id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <CheckCircle size={16} className="flex-shrink-0" />
                          Delivered
                        </button>
                        <button
                          onClick={() => setShowFailureModal(shipment._id)}
                          disabled={updatingShipment === shipment._id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <XCircle size={16} className="flex-shrink-0" />
                          Failed
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Proof Display */}
                {(isDelivered || isFailed) && (
                  <div className="px-3 sm:px-4 py-3 border-t border-gray-100 bg-gray-50">
                    {isDelivered && shipment.deliveryProof && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => setProofImageViewer(shipment.deliveryProof!.url)}
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded border-2 border-green-300 hover:border-green-400 overflow-hidden flex-shrink-0 transition-colors"
                        >
                          <img src={shipment.deliveryProof.url} alt="Proof" className="w-full h-full object-cover" />
                        </button>
                        <div>
                          <p className="text-xs font-semibold text-green-700">Delivery Proof</p>
                          <p className="text-xs text-gray-500">Click to enlarge</p>
                        </div>
                      </div>
                    )}

                    {isFailed && shipment.failureReason && (
                      <div className="flex items-start gap-2">
                        <XCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-700">Failed</p>
                          <p className="text-xs text-red-600 break-words">{shipment.failureReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Modals */}
                {showProofModal === shipment._id && (
                  <ProofOfDeliveryModal
                    shipmentId={shipment._id}
                    onSubmit={(proof) => handleStatusUpdate(shipment._id, 'Delivered', undefined, proof as any)}
                    onClose={() => setShowProofModal(null)}
                    isSubmitting={updatingShipment === shipment._id}
                  />
                )}

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
              );
            })}
          </div>
        )}
        
        {/* Image Viewer Modal */}
        {proofImageViewer && (
          <ImageViewerModal
            imageUrl={proofImageViewer}
            onClose={() => setProofImageViewer(null)}
          />
        )}
      </div>
    </div>
  );
}

// Image Viewer Modal
function ImageViewerModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Proof View</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-semibold text-xl w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-3 sm:p-6 flex justify-center bg-gray-50 overflow-auto">
          <img src={imageUrl} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded" />
        </div>
      </div>
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Proof of Delivery</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Capture signature or photo</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Proof Type</label>
            <div className="flex gap-3 sm:gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="signature"
                  checked={proofType === 'signature'}
                  onChange={(e) => {
                    setProofType(e.target.value as 'signature' | 'photo');
                    setProofUrl('');
                  }}
                  className="mr-2 w-4 h-4"
                />
                <span className="text-xs sm:text-sm text-gray-700">Signature</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="photo"
                  checked={proofType === 'photo'}
                  onChange={(e) => {
                    setProofType(e.target.value as 'signature' | 'photo');
                    setProofUrl('');
                  }}
                  className="mr-2 w-4 h-4"
                />
                <span className="text-xs sm:text-sm text-gray-700">Photo</span>
              </label>
            </div>
          </div>

          {proofType === 'photo' ? (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Upload Photo</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 sm:file:mr-3 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {isUploading && (
                <div className="mt-3 text-center">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-xs text-gray-600 mt-2">Uploading photo...</p>
                </div>
              )}
              {proofUrl && !isUploading && (
                <div className="mt-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <p className="text-xs text-green-600 mb-3 font-medium">Photo uploaded successfully</p>
                  <div className="relative">
                    <img 
                      src={proofUrl} 
                      alt="Delivery proof" 
                      className="w-full h-auto max-h-48 sm:max-h-64 object-cover rounded-lg border border-gray-300 shadow-sm" 
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Customer Signature</label>
              <p className="text-xs text-gray-500 mb-2">Note: Signature capture is a placeholder. In production, use a signature pad library.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center bg-gray-50 min-h-[120px] flex flex-col items-center justify-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Customer to sign here</p>
                <button
                  type="button"
                  onClick={() => {
                    // Placeholder: In real app, integrate with a signature pad library
                    setProofUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                    toast.success('Signature captured (placeholder)');
                  }}
                  className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 hover:bg-blue-50 rounded transition-colors"
                >
                  {proofUrl ? 'Signature Captured' : 'Confirm Signature'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || !proofUrl}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors order-1 sm:order-2"
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Delivery Failed</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Please select a reason</p>
        </div>

        <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
          {reasons.map((reason) => (
            <label key={reason} className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3 w-4 h-4 flex-shrink-0"
              />
              <span className="text-xs sm:text-sm text-gray-700">{reason}</span>
            </label>
          ))}

          {selectedReason === 'Other' && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Please explain..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors order-1 sm:order-2"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Failure'}
          </button>
        </div>
      </div>
    </div>
  );
}