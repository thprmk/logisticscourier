'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import { Plus, Send, TrendingDown, Loader, Package as PackageIcon, Check, Trash2, Box, Eye, Search, Rocket } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'create');
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

  // Update tab when searchParams change
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'create' || tab === 'incoming' || tab === 'outgoing')) {
      setActiveTab(tab as TabType);
    }
  }, [searchParams]);

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
        // Fetch only "In Transit" manifests for incoming
        const incomingRes = await fetch('/api/manifests?type=incoming&status=In Transit&limit=20', {
          credentials: 'include',
        });
        if (incomingRes.ok) {
          const incomingData = await incomingRes.json();
          setIncomingManifests(incomingData.data || incomingData);
        }

        // Fetch only "In Transit" manifests for outgoing
        const outgoingRes = await fetch('/api/manifests?type=outgoing&status=In Transit&limit=20', {
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
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dispatch Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
          Create manifests, track incoming deliveries, and manage outgoing shipments
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
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
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <TabIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 sm:mt-6">
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
          <ManifestListTab manifests={incomingManifests} type="incoming" searchParams={searchParams} />
        )}

        {/* Outgoing Manifests Tab */}
        {activeTab === 'outgoing' && (
          <ManifestListTab manifests={outgoingManifests} type="outgoing" searchParams={searchParams} />
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Left: Form Section */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <Rocket className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Dispatch Details</h3>
        </div>
        
        <div className="space-y-5">
          {/* Destination Branch */}
          <div>
            <Label htmlFor="dest-branch" className="text-sm font-semibold text-gray-700 mb-2 block">Destination Branch <span className="text-red-500">*</span></Label>
            <Select value={selectedDestBranch} onValueChange={setSelectedDestBranch}>
              <SelectTrigger id="dest-branch" className="h-11 bg-white border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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
            <Label htmlFor="vehicle" className="text-sm font-semibold text-gray-700 mb-2 block">Vehicle Number</Label>
            <Input
              id="vehicle"
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g., KA01AB1234"
              className="h-11 bg-white border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Driver Name */}
          <div>
            <Label htmlFor="driver" className="text-sm font-semibold text-gray-700 mb-2 block">Driver Name</Label>
            <Input
              id="driver"
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="e.g., Ramesh Kumar"
              className="h-11 bg-white border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-2 block">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
              className="bg-white border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Dispatch Summary</p>
              </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1.5 px-2 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium">Destination:</span>
                <span className="font-bold text-gray-900">{destBranchName || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-2 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium">Selected Shipments:</span>
                <span className="font-bold text-blue-600 text-lg">{selectedShipments.size}</span>
              </div>
            </div>
            <Button
              onClick={handleDispatch}
              disabled={!selectedDestBranch || selectedShipments.size === 0 || isSubmitting}
              className="w-full h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" strokeWidth={2.5} />
                  Dispatch Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Shipment Selection */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
              <PackageIcon className="h-5 w-5 text-purple-600" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Available Shipments
          </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {availableShipments.length} shipment{availableShipments.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          {availableShipments.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              className="text-xs h-9 px-3 border-gray-300 hover:bg-gray-50"
            >
              {selectedShipments.size === availableShipments.length
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          )}
        </div>

        {!selectedDestBranch ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <PackageIcon className="h-14 w-14 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-gray-600 font-semibold text-sm sm:text-base">Select a destination branch</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">to view available shipments</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Loader className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" strokeWidth={2} />
            <p className="text-gray-600 font-semibold text-sm sm:text-base">Loading shipments...</p>
          </div>
        ) : availableShipments.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <PackageIcon className="h-14 w-14 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-gray-600 font-semibold text-sm sm:text-base">No shipments available</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">for dispatch to this branch</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
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
    <label className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow-md' 
        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
    }`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="mt-1 w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-bold text-gray-900 text-sm font-mono">{shipment.trackingId}</p>
          {isSelected && (
            <div className="flex items-center justify-center w-6 h-6 bg-blue-600 rounded-full flex-shrink-0">
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </div>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs sm:text-sm text-gray-600">
            <span className="font-semibold text-gray-700">From:</span> <span className="font-medium text-gray-900">{shipment.sender.name}</span>
        </p>
          <p className="text-xs sm:text-sm text-gray-600">
            <span className="font-semibold text-gray-700">To:</span> <span className="font-medium text-gray-900">{shipment.recipient.name}</span>
        </p>
        </div>
      </div>
    </label>
  );
}

// Manifest List Tab Component
function ManifestListTab({ manifests, type, searchParams }: any) {
  const isIncoming = type === 'incoming';
  const isOutgoing = type === 'outgoing';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Enhanced: Reduced from 10 to 5 items per page for better readability

  // Update status filter when URL parameter changes
  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

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
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-12 sm:p-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
          <Box className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-gray-700 font-bold text-lg sm:text-xl mb-2">
          {isIncoming ? 'No incoming manifests yet' : 'No outgoing manifests yet'}
        </p>
        <p className="text-sm sm:text-base text-gray-500">
          {isIncoming
            ? 'Manifests from other branches will appear here'
            : 'Manifests you create will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" strokeWidth={2} />
            </div>
            <Input
              type="text"
              placeholder="Search by manifest ID or branch..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-10 sm:h-11 bg-white border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-10 sm:h-11 bg-white border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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
              className="h-10 sm:h-11 border-gray-300 hover:bg-gray-50"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Manifests Table */}
      {filteredManifests.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-8 sm:p-12 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3">
            <Box className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-gray-600 font-semibold text-sm sm:text-base">No manifests match your search</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                  <TableHead className="w-12 h-14 px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">No.</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Manifest ID</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">{isIncoming ? 'From' : 'To'}</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Shipments</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Vehicle</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Driver</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-3 sm:px-4 font-bold text-gray-700 text-xs uppercase tracking-wider text-right">Action</TableHead>
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
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm sm:text-base text-gray-600 font-semibold">
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
    <TableRow className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
      <TableCell className="px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-bold text-gray-700">{siNo}</TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-mono font-bold text-blue-600">{manifest._id}</TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold text-gray-700">
        {isIncoming ? manifest.fromBranchId?.name : manifest.toBranchId?.name || 'Unknown'}
      </TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-bold text-gray-900">{manifest.shipmentIds?.length || 0}</TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5 text-xs sm:text-sm text-gray-700">{manifest.vehicleNumber || '—'}</TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5 text-xs sm:text-sm text-gray-700">{manifest.driverName || '—'}</TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5">
        <Badge
          variant={manifest.status === 'In Transit' ? 'default' : 'secondary'}
          className={`text-xs font-semibold px-2.5 py-1 ${
            manifest.status === 'In Transit'
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-green-100 text-green-700 border-2 border-green-300'
          }`}
        >
          {manifest.status}
        </Badge>
      </TableCell>
      <TableCell className="px-3 sm:px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {isIncoming && !isCompleted && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isReceiving}
              size="sm"
              variant="default"
              className="h-8 sm:h-9 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold gap-1.5"
            >
              {isReceiving ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              )}
              Receive
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 sm:h-9 text-xs hover:bg-blue-50 hover:text-blue-600"
          >
            <Link href={`/dashboard/dispatch/${manifest._id}`}>
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
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
