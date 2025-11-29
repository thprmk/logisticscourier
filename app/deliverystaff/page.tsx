// app/deliverystaff/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { invalidateCache } from '@/lib/requestCache';
import { MapPin, Phone, Truck, CheckCircle, XCircle, Package, Building, Eye, Loader, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { Calendar } from '@/app/components/ui/calendar';

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
  createdAt: string;
}

export default function DeliveryStaffPage() {
  const { user } = useUser();
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use debounced search hook
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery, isSearching } = useDebouncedSearch({
    delay: 300,
    maxLength: 100,
    minLength: 0,
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'signature' | 'photo'>('signature');
  const [showFailureModal, setShowFailureModal] = useState<string | null>(null);
  const [proofImageViewer, setProofImageViewer] = useState<string | null>(null);
  const itemsPerPage = 10;

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
      // Auto-refresh every 30 seconds to prevent excessive API calls with large datasets
      const interval = setInterval(() => {
        if (!showProofModal && !showFailureModal) {
          fetchAssignedShipments();
        }
      }, 30000);
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

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setCurrentPage(1);
    // Invalidate cache after clearing filters
    invalidateCache('/api/shipments');
  };

  // Filter shipments based on debounced search and status
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = debouncedQuery === '' || 
                         shipment.trackingId.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
                         shipment.recipient.name.toLowerCase().includes(debouncedQuery.toLowerCase());
    const matchesStatus = !statusFilter || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex);

  // Calculate statistics
  const deliveredCount = shipments.filter(s => s.status === 'Delivered').length;
  const assignedCount = shipments.filter(s => s.status === 'Assigned').length;
  const atOriginCount = shipments.filter(s => s.status === 'At Origin Branch').length;
  const failedCount = shipments.filter(s => s.status === 'Failed').length;

  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);

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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Deliveries</h1>
        <p className="text-gray-600 mt-2">Track and manage your assigned deliveries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-green-200/60 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-widest">Delivered</p>
              <p className="text-4xl font-bold text-green-900 mt-3 font-mono">{deliveredCount}</p>
            </div>
            <div className="bg-green-500/15 rounded-2xl p-4">
              <CheckCircle className="h-10 w-10 text-green-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-cyan-200/60 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-cyan-700 uppercase tracking-widest">Assigned</p>
              <p className="text-4xl font-bold text-cyan-900 mt-3 font-mono">{assignedCount}</p>
            </div>
            <div className="bg-cyan-500/15 rounded-2xl p-4">
              <Truck className="h-10 w-10 text-cyan-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-purple-200/60 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">At Origin</p>
              <p className="text-4xl font-bold text-purple-900 mt-3 font-mono">{atOriginCount}</p>
            </div>
            <div className="bg-purple-500/15 rounded-2xl p-4">
              <Building className="h-10 w-10 text-purple-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-200/60 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-widest">Failed</p>
              <p className="text-4xl font-bold text-red-900 mt-3 font-mono">{failedCount}</p>
            </div>
            <div className="bg-red-500/15 rounded-2xl p-4">
              <XCircle className="h-10 w-10 text-red-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {!isLoading && shipments.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
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
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Loader className="h-4 w-4 text-orange-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-end gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            {/* Date Range */}
            <div className="flex-1 sm:flex-none min-w-[150px]">
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
                    <div className="p-2">
                      <Label className="text-xs mb-1 block">Start Date</Label>
                      <Calendar
                        mode="single"
                        selected={dateRangeStart ? new Date(dateRangeStart) : undefined}
                        onSelect={(date) => setDateRangeStart(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) =>
                          dateRangeEnd ? date > new Date(dateRangeEnd) : false
                        }
                        className="scale-90 origin-top-left"
                      />
                    </div>
                    <div className="p-2">
                      <Label className="text-xs mb-1 block">End Date</Label>
                      <Calendar
                        mode="single"
                        selected={dateRangeEnd ? new Date(dateRangeEnd) : undefined}
                        onSelect={(date) => setDateRangeEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) =>
                          dateRangeStart ? date < new Date(dateRangeStart) : false
                        }
                        className="scale-90 origin-top-left"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Status Filter */}
            <div className="flex-1 sm:flex-none min-w-[150px]">
              <Label htmlFor="filter-status" className="text-xs block mb-1">Status</Label>
              <Select value={statusFilter || 'all'} onValueChange={(val) => {
                setStatusFilter(val === 'all' ? '' : val);
                setCurrentPage(1);
              }}>
                <SelectTrigger id="filter-status" className="h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" variant="orange">All Statuses</SelectItem>
                  <SelectItem value="Assigned" variant="orange">Assigned</SelectItem>
                  <SelectItem value="Out for Delivery" variant="orange">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered" variant="orange">Delivered</SelectItem>
                  <SelectItem value="Failed" variant="orange">Failed</SelectItem>
                  <SelectItem value="At Origin Branch" variant="orange">At Origin Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Button */}
            {(searchQuery || statusFilter || dateRangeStart || dateRangeEnd) && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearAllFilters}
                className="h-9 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="text-center">
            <Loader className="inline-block animate-spin h-8 w-8 text-orange-500 mb-2" />
            <p className="text-sm text-gray-600">Loading your deliveries...</p>
          </div>
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-300 mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-gray-900">No deliveries assigned</h3>
          <p className="text-sm text-gray-500 mt-1">You don't have any deliveries to complete right now</p>
        </div>
      ) : paginatedShipments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">No deliveries found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table className="text-base">
              <TableHeader>
                <TableRow className="bg-gray-50 h-12">
                  <TableHead>S/No</TableHead>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedShipments.map((shipment, index) => {
                  const isDelivered = shipment.status === 'Delivered';
                  const isFailed = shipment.status === 'Failed';
                  const isOutForDelivery = shipment.status === 'Out for Delivery';
                  const isAssigned = shipment.status === 'Assigned';

                  return (
                    <TableRow key={shipment._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium text-base">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{shipment.trackingId}</TableCell>
                      <TableCell className="font-medium">{shipment.recipient.name}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">{shipment.recipient.address}</TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {(isAssigned || isOutForDelivery) ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGetDirections(shipment.recipient.address)}
                                title="Get directions"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCallCustomer(shipment.recipient.phone)}
                                title="Call customer"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                              {isAssigned && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(shipment._id, 'Out for Delivery')}
                                  disabled={updatingShipment === shipment._id}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {updatingShipment === shipment._id ? '...' : 'Start'}
                                </Button>
                              )}
                              {isOutForDelivery && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => setShowProofModal(shipment._id)}
                                    disabled={updatingShipment === shipment._id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Done
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setShowFailureModal(shipment._id)}
                                    disabled={updatingShipment === shipment._id}
                                    variant="destructive"
                                  >
                                    Fail
                                  </Button>
                                </>
                              )}
                            </>
                          ) : isDelivered && shipment.deliveryProof ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setProofImageViewer(shipment.deliveryProof!.url)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">Proof</span>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredShipments.length)} of {filteredShipments.length} deliveries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modals - only render for paginated shipments */}
      {paginatedShipments.map((shipment) => (
        <div key={shipment._id}>
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
      ))}

      {/* Image Viewer Modal */}
      {proofImageViewer && (
        <ImageViewerModal
          imageUrl={proofImageViewer as string}
          onClose={() => setProofImageViewer(null)}
        />
      )}
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Proof View</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center bg-gray-50 overflow-auto py-6">
          <img src={imageUrl} alt="Proof" className="max-w-full max-h-[70vh] object-contain rounded" />
        </div>
      </DialogContent>
    </Dialog>
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proof of Delivery</DialogTitle>
          <DialogDescription>Capture signature or photo</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Proof Type</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="sig"
                  value="signature"
                  checked={proofType === 'signature'}
                  onChange={(e) => {
                    setProofType(e.target.value as 'signature' | 'photo');
                    setProofUrl('');
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="sig" className="text-sm cursor-pointer">Signature</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="photo"
                  value="photo"
                  checked={proofType === 'photo'}
                  onChange={(e) => {
                    setProofType(e.target.value as 'signature' | 'photo');
                    setProofUrl('');
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="photo" className="text-sm cursor-pointer">Photo</label>
              </div>
            </div>
          </div>

          {proofType === 'photo' ? (
            <div className="space-y-2">
              <Label htmlFor="photo-upload">Upload Photo</Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
              />
              {isUploading && (
                <div className="text-center py-4">
                  <Loader className="inline-block animate-spin h-6 w-6 text-blue-500 mb-2" />
                  <p className="text-xs text-gray-600">Uploading photo...</p>
                </div>
              )}
              {proofUrl && !isUploading && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <p className="text-xs text-green-600 font-medium">Photo uploaded successfully</p>
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
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Customer Signature</Label>
              <p className="text-xs text-gray-500">Note: Signature capture is a placeholder. In production, use a signature pad library.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 min-h-[120px] flex flex-col items-center justify-center">
                <p className="text-sm text-gray-600 mb-2">Customer to sign here</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProofUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                    toast.success('Signature captured (placeholder)');
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {proofUrl ? 'Signature Captured' : 'Confirm Signature'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading || !proofUrl}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Delivery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Failed</DialogTitle>
          <DialogDescription>Please select a reason</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {reasons.map((reason) => (
            <label key={reason} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3 w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}

          {selectedReason === 'Other' && (
            <div className="mt-2">
              <Input
                type="text"
                placeholder="Please explain..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            variant="destructive"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Failure'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}