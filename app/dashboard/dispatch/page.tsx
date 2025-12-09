'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import { Plus, Send, TrendingDown, Loader, Package as PackageIcon, Check, Trash2, Box, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface IBranch {
  _id: string;
  name: string;
}

interface IShipment {
  _id: string;
  trackingId: string;
  sender: { name: string; address: string };
  recipient: { name: string; address: string };
  originBranchId: IBranch;
  destinationBranchId: IBranch;
  currentBranchId: string;
  status: string;
  createdAt: string;
}

interface IManifest {
  _id: string;
  fromBranchId: IBranch;
  toBranchId: IBranch;
  shipmentIds: string[];
  status: 'In Transit' | 'Completed';
  vehicleNumber?: string;
  driverName?: string;
  dispatchedAt: string;
  receivedAt?: string;
}

type TabType = 'create' | 'incoming' | 'outgoing';

export default function DispatchPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [selectedDestBranch, setSelectedDestBranch] = useState('');
  const [availableShipments, setAvailableShipments] = useState<IShipment[]>([]);
  const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set());
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incomingManifests, setIncomingManifests] = useState<IManifest[]>([]);
  const [outgoingManifests, setOutgoingManifests] = useState<IManifest[]>([]);

  // Fetch branches and initial manifests
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/tenants', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch branches');
        const data = await response.json();
        setBranches(data);
      } catch (error) {
        console.error('Error fetching branches:', error);
        toast.error('Failed to load branches');
      }
    };
    
    const fetchManifests = async () => {
      try {
        const incomingRes = await fetch('/api/manifests?type=incoming&limit=20', {
          credentials: 'include',
        });
        if (incomingRes.ok) {
          const incomingData = await incomingRes.json();
          setIncomingManifests(incomingData.data || incomingData);
        }

        const outgoingRes = await fetch('/api/manifests?type=outgoing&limit=20', {
          credentials: 'include',
        });
        if (outgoingRes.ok) {
          const outgoingData = await outgoingRes.json();
          setOutgoingManifests(outgoingData.data || outgoingData);
        }
      } catch (error) {
        console.error('Error fetching manifests:', error);
      }
    };
    
    fetchBranches();
    fetchManifests();
    
    // Auto-refresh manifests every 30 seconds to prevent database load with large datasets
    const interval = setInterval(fetchManifests, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch available shipments when destination branch changes
  useEffect(() => {
    if (!selectedDestBranch) {
      setAvailableShipments([]);
      return;
    }

    const fetchShipments = async () => {
      try {
        setIsLoading(true);
        const url = new URL('/api/manifests/available-shipments', window.location.origin);
        url.searchParams.set('destinationBranchId', selectedDestBranch);
        url.searchParams.set('limit', '50');
        
        const response = await fetch(url.toString(), {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch shipments');
        const responseData = await response.json();
        // Handle both paginated and non-paginated response formats
        const shipments = responseData.data || responseData;
        setAvailableShipments(shipments);
        setSelectedShipments(new Set()); // Reset selection
      } catch (error) {
        console.error('Error fetching shipments:', error);
        toast.error('Failed to load available shipments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipments();
  }, [selectedDestBranch]);

  // ... existing code ...

  const handleSelectShipment = (shipmentId: string) => {
    const newSelected = new Set(selectedShipments);
    if (newSelected.has(shipmentId)) {
      newSelected.delete(shipmentId);
    } else {
      newSelected.add(shipmentId);
    }
    setSelectedShipments(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedShipments.size === availableShipments.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(availableShipments.map(s => s._id)));
    }
  };

  const handleDispatch = async () => {
    if (!selectedDestBranch) {
      toast.error('Please select a destination branch');
      return;
    }
    if (selectedShipments.size === 0) {
      toast.error('Please select at least one shipment');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Creating manifest and dispatching shipments...');

    try {
      const response = await fetch('/api/manifests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toBranchId: selectedDestBranch,
          shipmentIds: Array.from(selectedShipments),
          vehicleNumber: vehicleNumber || undefined,
          driverName: driverName || undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create manifest');
      }

      const manifest = await response.json();
      toast.success(`Manifest created successfully! ID: ${manifest._id}`, { id: toastId });

      // Reset form
      setSelectedDestBranch('');
      setSelectedShipments(new Set());
      setVehicleNumber('');
      setDriverName('');
      setNotes('');
      setAvailableShipments([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create manifest', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const destBranchName = branches.find(b => b._id === selectedDestBranch)?.name;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dispatch Management</h1>
        <p className="text-base text-gray-600 mt-2">
          Create manifests, track incoming deliveries, and manage outgoing shipments
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
        {[
          { value: 'create', label: 'Create Dispatch', icon: Plus },
          { value: 'incoming', label: `Incoming (${incomingManifests.length})`, icon: TrendingDown },
          { value: 'outgoing', label: `Outgoing (${outgoingManifests.length})`, icon: Send },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as TabType)}
              className={`px-5 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-600 bg-blue-50/30'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
        </div>
      </div>

      <div className="mt-8">
        {/* Create Dispatch Tab */}
        {activeTab === 'create' && (
          <CreateDispatchTab
            branches={branches}
            selectedDestBranch={selectedDestBranch}
            setSelectedDestBranch={setSelectedDestBranch}
            availableShipments={availableShipments}
            selectedShipments={selectedShipments}
            handleSelectShipment={handleSelectShipment}
            handleSelectAll={handleSelectAll}
            vehicleNumber={vehicleNumber}
            setVehicleNumber={setVehicleNumber}
            driverName={driverName}
            setDriverName={setDriverName}
            notes={notes}
            setNotes={setNotes}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            destBranchName={destBranchName}
            handleDispatch={handleDispatch}
          />
        )}

        {/* Incoming Manifests Tab */}
        {activeTab === 'incoming' && (
          <ManifestListTab manifests={incomingManifests} type="incoming" />
        )}

        {/* Outgoing Manifests Tab */}
        {activeTab === 'outgoing' && (
          <ManifestListTab manifests={outgoingManifests} type="outgoing" />
        )}
      </div>
    </div>
  );
}

// Create Dispatch Tab Component
function CreateDispatchTab({
  branches,
  selectedDestBranch,
  setSelectedDestBranch,
  availableShipments,
  selectedShipments,
  handleSelectShipment,
  handleSelectAll,
  vehicleNumber,
  setVehicleNumber,
  driverName,
  setDriverName,
  notes,
  setNotes,
  isLoading,
  isSubmitting,
  destBranchName,
  handleDispatch,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Dispatch Details</h3>
        
        <div className="space-y-5">
          {/* Destination Branch */}
          <div>
            <Label htmlFor="dest-branch" className="text-sm font-medium">Destination Branch <span className="text-red-500">*</span></Label>
            <Select value={selectedDestBranch} onValueChange={setSelectedDestBranch}>
              <SelectTrigger id="dest-branch" className="mt-2">
                <SelectValue placeholder="Select a branch..." />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch: IBranch) => (
                  <SelectItem key={branch._id} value={branch._id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Number */}
          <div>
            <Label htmlFor="vehicle" className="text-sm font-medium">Vehicle Number</Label>
            <Input
              id="vehicle"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g., KA01AB1234"
              className="mt-2"
            />
          </div>

          {/* Driver Name */}
          <div>
            <Label htmlFor="driver" className="text-sm font-medium">Driver Name</Label>
            <Input
              id="driver"
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g., Ramesh Kumar"
              className="mt-2"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-900 uppercase">Dispatch Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Destination:</span>
                <span className="font-semibold text-gray-900">{destBranchName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Shipments:</span>
                <span className="font-semibold text-gray-900">{selectedShipments.size}</span>
              </div>
            </div>
            <Button
              onClick={handleDispatch}
              disabled={!selectedDestBranch || selectedShipments.size === 0 || isSubmitting}
              className="w-full gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Dispatch Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Shipment Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Available Shipments <span className="text-gray-500 font-normal text-base">({availableShipments.length})</span>
          </h3>
          {availableShipments.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              className="text-xs"
            >
              {selectedShipments.size === availableShipments.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          )}
        </div>

        {!selectedDestBranch ? (
          <div className="text-center py-16">
            <PackageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Select a destination branch to view available shipments</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <Loader className="h-8 w-8 text-blue-500 mx-auto mb-3 animate-spin" />
            <p className="text-gray-600 font-medium">Loading shipments...</p>
          </div>
        ) : availableShipments.length === 0 ? (
          <div className="text-center py-16">
            <PackageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No shipments available for dispatch to this branch</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {availableShipments.map((shipment: IShipment) => (
              <ShipmentCheckItem
                key={shipment._id}
                shipment={shipment}
                isSelected={selectedShipments.has(shipment._id)}
                onToggle={() => handleSelectShipment(shipment._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Shipment Check Item Component
function ShipmentCheckItem({ shipment, isSelected, onToggle }: any) {
  return (
    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-semibold text-gray-900 text-sm">{shipment.trackingId}</p>
          {isSelected && <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}
        </div>
        <p className="text-sm text-gray-600 mb-1">
          From: <span className="font-medium text-gray-900">{shipment.sender.name}</span>
        </p>
        <p className="text-sm text-gray-600">
          To: <span className="font-medium text-gray-900">{shipment.recipient.name}</span>
        </p>
      </div>
    </label>
  );
}

// Manifest List Tab Component
function ManifestListTab({ manifests, type }: any) {
  const isIncoming = type === 'incoming';
  const isOutgoing = type === 'outgoing';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Enhanced: Reduced from 10 to 5 items per page for better readability

  const filteredManifests = manifests.filter((manifest: IManifest) => {
    const matchesSearch = 
      manifest._id.includes(searchQuery) ||
      manifest.fromBranchId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manifest.toBranchId?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || manifest.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredManifests.length / itemsPerPage);
  const paginatedManifests = filteredManifests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  if (manifests.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
        <Box className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium text-lg">
          {isIncoming ? 'No incoming manifests yet' : 'No outgoing manifests yet'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {isIncoming
            ? 'Manifests from other branches will appear here'
            : 'Manifests you create will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by manifest ID or branch..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || statusFilter) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearFilters}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Manifests Table */}
      {filteredManifests.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Box className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">No manifests match your search</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 border-b border-gray-200">
                  <TableHead className="w-12 h-12 px-4 font-semibold text-gray-700 text-xs uppercase">No.</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase">Manifest ID</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase">{isIncoming ? 'From' : 'To'}</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase">Shipments</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase">Vehicle</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase">Driver</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase">Status</TableHead>
                  <TableHead className="px-4 font-semibold text-gray-700 text-xs uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedManifests.map((manifest: IManifest, index: number) => (
                  <ManifestTableRow
                    key={manifest._id}
                    manifest={manifest}
                    type={type}
                    siNo={(currentPage - 1) * itemsPerPage + index + 1}
                    isIncoming={isIncoming}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 font-medium">
                  Showing <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredManifests.length)}</span> of <span className="font-bold text-gray-900">{filteredManifests.length}</span> manifests
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-9 px-3"
                  >
                    ← Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {totalPages <= 5 ? (
                      Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-9 min-w-[36px]"
                        >
                          {page}
                        </Button>
                      ))
                    ) : (
                      <>
                        {Array.from({ length: Math.min(2, totalPages) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-9 min-w-[36px]"
                          >
                            {page}
                          </Button>
                        ))}
                        {totalPages > 4 && (
                          <span className="px-2 text-gray-500 font-medium">...</span>
                        )}
                        {totalPages > 2 && (
                          <Button
                            variant={currentPage === totalPages ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="h-9 min-w-[36px]"
                          >
                            {totalPages}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 px-3"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Manifest Table Row Component
function ManifestTableRow({ manifest, type, siNo, isIncoming }: any) {
  const isCompleted = manifest.status === 'Completed';
  const [isReceiving, setIsReceiving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirmReceive = async () => {
    setShowConfirmDialog(false);
    setIsReceiving(true);
    const toastId = toast.loading('Confirming receipt...');

    try {
      const response = await fetch(`/api/manifests/${manifest._id}/receive`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to receive manifest');
      }

      toast.success('Manifest received successfully!', { id: toastId });
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to receive manifest', { id: toastId });
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <TableRow className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <TableCell className="px-4 py-3 text-xs font-bold text-gray-700">{siNo}</TableCell>
      <TableCell className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{manifest._id}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-700">
        {isIncoming ? manifest.fromBranchId?.name : manifest.toBranchId?.name || 'Unknown'}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm font-bold text-gray-900">{manifest.shipmentIds?.length || 0}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-700">{manifest.vehicleNumber || '—'}</TableCell>
      <TableCell className="px-4 py-3 text-sm text-gray-700">{manifest.driverName || '—'}</TableCell>
      <TableCell className="px-4 py-3">
        <Badge
          variant={manifest.status === 'In Transit' ? 'default' : 'secondary'}
          className={`text-xs ${
            manifest.status === 'In Transit'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}
        >
          {manifest.status}
        </Badge>
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {isIncoming && !isCompleted && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isReceiving}
              size="sm"
              variant="default"
              className="h-8 text-xs"
            >
              {isReceiving ? (
                <Loader className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Receive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 text-xs"
          >
            <Link href={`/dashboard/dispatch/${manifest._id}`}>
              <Eye className="h-3 w-3" />
              View
            </Link>
          </Button>
        </div>
      </TableCell>

      {/* Confirm Receipt Dialog */}
      {showConfirmDialog && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Manifest Receipt</DialogTitle>
              <DialogDescription>
                Are you sure you want to mark this manifest as received?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmReceive} disabled={isReceiving}>
                {isReceiving ? 'Confirming...' : 'Confirm Receipt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TableRow>
  );
}
