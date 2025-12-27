// app/deliverystaff/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/navigation';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { invalidateCache } from '@/lib/requestCache';
import { MapPin, Phone, Truck, CheckCircle, XCircle, Package, Building, Eye, Loader, Search, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { StatCard } from '@/app/dashboard/DashboardComponents';
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
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
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [shipments, setShipments] = useState<IShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use debounced search hook
  const { query: searchQuery, setQuery: setSearchQuery, debouncedQuery, isSearching } = useDebouncedSearch({
    delay: 300,
    maxLength: 100,
    minLength: 0,
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(undefined);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingShipment, setUpdatingShipment] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [showFailureModal, setShowFailureModal] = useState<string | null>(null);
  const [proofImageViewer, setProofImageViewer] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const itemsPerPage = 10;

  const failureReasons = [
    'Customer Not Available',
    'Address Incorrect or Incomplete',
    'Customer Refused Delivery',
    'Package Damaged',
    'Wrong Item',
    'Other',
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

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

  // ... existing code ...

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
    setCurrentPage(1);
    setDropdownOpen(false);
    // Invalidate cache after clearing filters
    invalidateCache('/api/shipments');
  };

  const handleApplyFilter = () => {
    if (dateRangeStart && dateRangeEnd) {
      const from = dateRangeStart.toISOString().split('T')[0];
      const to = new Date(dateRangeEnd);
      to.setDate(to.getDate() + 1);
      const toStr = to.toISOString().split('T')[0];

      setCurrentPage(1);
      setDropdownOpen(false);
      console.log(`Filtering deliveries from ${from} to ${toStr}`);
    }
  };

  const handleAllTime = () => {
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
    setCurrentPage(1);
    setDropdownOpen(false);
  };

  const handleResetDate = () => {
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
    setCurrentPage(1);
    setDropdownOpen(false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-[#333333]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 dark:border-t-orange-400 border-r-orange-500 dark:border-r-orange-400 animate-spin" style={{ animationDuration: '0.6s' }}></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Filter shipments based on debounced search, status, and date range
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = debouncedQuery === '' ||
      shipment.trackingId.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      shipment.recipient.name.toLowerCase().includes(debouncedQuery.toLowerCase());
    const matchesStatus = !statusFilter || shipment.status === statusFilter;

    let matchesDateRange = true;
    if (dateRangeStart && dateRangeEnd) {
      const shipmentDate = new Date(shipment.createdAt);
      shipmentDate.setHours(0, 0, 0, 0);
      const filterStart = new Date(dateRangeStart);
      filterStart.setHours(0, 0, 0, 0);
      const filterEnd = new Date(dateRangeEnd);
      filterEnd.setHours(23, 59, 59, 999);
      matchesDateRange = shipmentDate >= filterStart && shipmentDate <= filterEnd;
    }

    return matchesSearch && matchesStatus && matchesDateRange;
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
      'At Origin Branch': 'bg-[#8B5CF6] text-white', // Purple
      'In Transit to Destination': 'bg-[#3B82F6] text-white', // Blue
      'At Destination Branch': 'bg-[#2563EB] text-white', // Darker Blue
      'Assigned': 'bg-[#06B6D4] text-white', // Cyan
      'Out for Delivery': 'bg-[#F97316] text-white', // Orange
      'Delivered': 'bg-[#16A34A] text-white', // Green
      'Failed': 'bg-[#E11D48] text-white', // Red
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-600 text-white'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Deliveries</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Track and manage your assigned deliveries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          label="Delivered"
          value={deliveredCount}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Assigned"
          value={assignedCount}
          icon={Truck}
          color="cyan"
        />
        <StatCard
          label="At Origin"
          value={atOriginCount}
          icon={Building}
          color="purple"
        />
        <StatCard
          label="Failed"
          value={failedCount}
          icon={XCircle}
          color="red"
        />
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
                <div className="relative h-4 w-4">
                  <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 border-r-orange-500 animate-spin" style={{ animationDuration: '0.6s' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Picker */}
            <div className="flex-1 min-w-[200px]">
              <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-start text-sm font-normal"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRangeStart && dateRangeEnd
                      ? `${dateRangeStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${dateRangeEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`
                      : 'Pick date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-0">
                    <div className="p-3">
                      <Calendar
                        mode="single"
                        selected={dateRangeStart}
                        onSelect={(date) => {
                          setDateRangeStart(date);
                          // If selecting the same date twice, set it as both start and end
                          if (date && dateRangeStart && dateRangeStart.toDateString() === date.toDateString()) {
                            setDateRangeEnd(date);
                          } else if (date && dateRangeEnd && date > dateRangeEnd) {
                            setDateRangeEnd(undefined);
                          }
                        }}
                        disabled={(date) =>
                          dateRangeEnd ? date > dateRangeEnd : false
                        }
                      />
                    </div>
                    <div className="p-3">
                      <Calendar
                        mode="single"
                        selected={dateRangeEnd}
                        onSelect={(date) => setDateRangeEnd(date)}
                        disabled={(date) =>
                          dateRangeStart ? date < dateRangeStart : false
                        }
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Apply Filter Button - Always show when dates are selected */}
            {(dateRangeStart || dateRangeEnd) && (
              <Button
                onClick={handleApplyFilter}
                className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                Apply
              </Button>
            )}

            {/* All Time Button */}
            {(dateRangeStart || dateRangeEnd) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAllTime}
                className="h-9 text-sm"
              >
                All Time
              </Button>
            )}

            {/* Reset Button */}
            {(dateRangeStart || dateRangeEnd) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetDate}
                className="h-9 text-sm"
              >
                Reset
              </Button>
            )}

            {/* Status Filter */}
            <div className="flex-1 min-w-[150px]">
              <Select value={statusFilter || 'all'} onValueChange={(val) => {
                setStatusFilter(val === 'all' ? '' : val);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="At Origin Branch">At Origin Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Button */}
            {(searchQuery || statusFilter || dateRangeStart || dateRangeEnd) && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearAllFilters}
                className="h-9 text-sm"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48 bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-transparent shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-[#333333]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 border-r-blue-600 dark:border-r-blue-400 animate-spin" style={{ animationDuration: '0.6s' }}></div>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading...</p>
          </div>
        </div>
      ) : shipments.length === 0 ? (
        <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-transparent shadow-sm p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-300 mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">No deliveries assigned</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You don't have any deliveries to complete right now</p>
        </div>
      ) : paginatedShipments.length === 0 ? (
        <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-transparent shadow-sm p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No deliveries found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block border border-gray-200 dark:border-transparent rounded-lg overflow-hidden bg-white dark:bg-[#222222]">
            <Table className="text-base">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-[#1C1C1C]/50 h-12 border-b border-gray-200 dark:border-gray-700/50">
                  <TableHead className="text-gray-700 dark:text-gray-300">S/No</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Tracking ID</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Recipient</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Address</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedShipments.map((shipment, index) => {
                  const isDelivered = shipment.status === 'Delivered';
                  const isFailed = shipment.status === 'Failed';
                  const isOutForDelivery = shipment.status === 'Out for Delivery';
                  const isAssigned = shipment.status === 'Assigned';

                  return (
                    <TableRow key={shipment._id} className="hover:bg-gray-50 dark:hover:bg-[#0F0F0F]/50 border-b border-gray-100 dark:border-gray-700/50">
                      <TableCell className="font-medium text-base text-gray-900 dark:text-white">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-900 dark:text-white">{shipment.trackingId}</TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{shipment.recipient.name}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{shipment.recipient.address}</TableCell>
                      <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                      <TableCell className="text-gray-500 dark:text-gray-400 text-sm">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedShipments.map((shipment, index) => {
              const isDelivered = shipment.status === 'Delivered';
              const isOutForDelivery = shipment.status === 'Out for Delivery';
              const isAssigned = shipment.status === 'Assigned';

              return (
                <Card key={shipment._id} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">#{startIndex + index + 1}</span>
                          <span className="text-xs font-mono font-semibold text-gray-700">{shipment.trackingId}</span>
                        </div>
                        <CardTitle className="text-base">{shipment.recipient.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Address */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold mb-1">ADDRESS</p>
                      <p className="text-sm text-gray-700">{shipment.recipient.address}</p>
                    </div>

                    {/* Status and Date Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">STATUS</p>
                        {getStatusBadge(shipment.status)}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">DATE</p>
                        <p className="text-sm text-gray-700">
                          {new Date(shipment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    {(isAssigned || isOutForDelivery) && (
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-2">CONTACT</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1"
                            onClick={() => handleGetDirections(shipment.recipient.address)}
                          >
                            <MapPin className="h-4 w-4" />
                            Directions
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1"
                            onClick={() => handleCallCustomer(shipment.recipient.phone)}
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="border-t pt-3">
                      <div className="space-y-2">
                        {isAssigned && (
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 touch-manipulation"
                            disabled={updatingShipment === shipment._id}
                            onClick={() => handleStatusUpdate(shipment._id, 'Out for Delivery')}
                          >
                            {updatingShipment === shipment._id ? 'Starting...' : 'Start Delivery'}
                          </Button>
                        )}
                        {isOutForDelivery && (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              disabled={updatingShipment === shipment._id}
                              onClick={() => setShowProofModal(shipment._id)}
                            >
                              {updatingShipment === shipment._id ? '...' : 'Done'}
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={updatingShipment === shipment._id}
                              onClick={() => setShowFailureModal(shipment._id)}
                            >
                              {updatingShipment === shipment._id ? '...' : 'Fail'}
                            </Button>
                          </div>
                        )}
                        {isDelivered && shipment.deliveryProof && (
                          <Button
                            variant="outline"
                            className="w-full gap-1"
                            onClick={() => setProofImageViewer(shipment.deliveryProof!.url)}
                          >
                            <Eye className="h-4 w-4" />
                            View Proof
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredShipments.length)} of {filteredShipments.length} deliveries
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="gap-1 flex-1 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="gap-1 flex-1 sm:flex-none"
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
      <DialogContent className="max-w-2xl max-h-[90vh] bg-white dark:bg-[#1C1C1C] border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Proof View</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center bg-gray-50 dark:bg-[#111111] overflow-auto py-6 rounded-md">
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
      toast.error('Please provide a photo');
      return;
    }
    onSubmit({
      type: 'photo',
      url: proofUrl,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto bg-white dark:bg-[#1C1C1C] border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Proof of Delivery</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">Upload photo as proof</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                <p className="text-xs text-gray-600 dark:text-gray-400">Uploading photo...</p>
              </div>
            )}
            {proofUrl && !isUploading && (
              <div className="bg-gray-50 dark:bg-[#111111] p-4 rounded-lg space-y-3">
                <p className="text-xs text-green-600 dark:text-green-500 font-medium">Photo uploaded successfully</p>
                <img
                  src={proofUrl}
                  alt="Delivery proof"
                  className="w-full h-auto max-h-64 object-cover rounded-lg border border-gray-300 dark:border-gray-700 shadow-sm"
                  onError={(e) => {
                    console.error('Image failed to load:', proofUrl);
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22sans-serif%22 font-size=%2220%22 fill=%22%23999%22%3EImage failed to load%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]"
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1C1C1C] border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Delivery Failed</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">Please select a reason</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {reasons.map((reason) => (
            <label key={reason} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#252525] cursor-pointer transition-colors">
              <input
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mr-3 w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{reason}</span>
            </label>
          ))}

          {selectedReason === 'Other' && (
            <div className="mt-2">
              <Input
                type="text"
                placeholder="Please explain..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                className="bg-white dark:bg-[#1A1A1A] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]"
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