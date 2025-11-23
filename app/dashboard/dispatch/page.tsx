'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../../context/UserContext';
import { Boxes, Send, TrendingDown, Plus, Eye, Check, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
        const incomingRes = await fetch('/api/manifests?type=incoming', {
          credentials: 'include',
        });
        if (incomingRes.ok) {
          setIncomingManifests(await incomingRes.json());
        }

        const outgoingRes = await fetch('/api/manifests?type=outgoing', {
          credentials: 'include',
        });
        if (outgoingRes.ok) {
          setOutgoingManifests(await outgoingRes.json());
        }
      } catch (error) {
        console.error('Error fetching manifests:', error);
      }
    };
    
    fetchBranches();
    fetchManifests();
    
    // Auto-refresh manifests every 5 seconds
    const interval = setInterval(fetchManifests, 5000);
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
        
        const response = await fetch(url.toString(), {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch shipments');
        const data = await response.json();
        setAvailableShipments(data);
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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Incoming Manifests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{incomingManifests.length}</p>
            </div>
            <TrendingDown className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Outgoing Manifests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{outgoingManifests.length}</p>
            </div>
            <Send className="h-6 w-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Available for Dispatch</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{availableShipments.length}</p>
            </div>
            <Boxes className="h-6 w-6 text-orange-600" />
          </div>
        </div>
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
    <div className="space-y-6">
      {/* Selection Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Branch Selection and Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 sticky top-6">
            {/* Destination Branch */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Destination Branch <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedDestBranch}
                onChange={(e) => setSelectedDestBranch(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select a branch...</option>
                {branches.map((branch: IBranch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Vehicle Number
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g., KA01AB1234"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Driver Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Driver Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g., Ramesh Kumar"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600 font-semibold">DISPATCH SUMMARY</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Destination:</span>
                  <span className="font-semibold text-gray-900">{destBranchName || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Selected:</span>
                  <span className="font-semibold text-gray-900">{selectedShipments.size} shipments</span>
                </div>
                <div className="h-px bg-blue-200 my-2"></div>
                <button
                  onClick={handleDispatch}
                  disabled={!selectedDestBranch || selectedShipments.size === 0 || isSubmitting}
                  className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
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
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Shipment Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-gray-900">
                Available Shipments <span className="text-gray-500 font-normal">({availableShipments.length})</span>
              </h3>
              {availableShipments.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {selectedShipments.size === availableShipments.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              )}
            </div>

            {!selectedDestBranch ? (
              <div className="text-center py-16">
                <Boxes className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Select a destination branch to view available shipments</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-gray-600 font-medium">Loading shipments...</p>
              </div>
            ) : availableShipments.length === 0 ? (
              <div className="text-center py-16">
                <Boxes className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No shipments available for dispatch to this branch</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
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

  if (manifests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
        <Boxes className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
      {manifests.map((manifest: IManifest) => (
        <ManifestCard key={manifest._id} manifest={manifest} type={type} />
      ))}
    </div>
  );
}

// Manifest Card Component
function ManifestCard({ manifest, type }: any) {
  const isIncoming = type === 'incoming';
  const isCompleted = manifest.status === 'Completed';
  const [isReceiving, setIsReceiving] = useState(false);

  const handleReceive = async () => {
    if (!confirm('Confirm receipt of this manifest?')) return;

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
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-bold text-gray-900">Manifest {manifest._id.slice(-6)}</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                isCompleted
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {manifest.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 font-medium">
            {isIncoming
              ? `📥 From: ${manifest.fromBranchId.name}`
              : `📤 To: ${manifest.toBranchId.name}`}
          </p>
        </div>
        <Link
          href={`/dashboard/dispatch/${manifest._id}`}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-semibold text-sm"
        >
          <Eye className="h-4 w-4" />
          View Details
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-5 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Shipments</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{manifest.shipmentIds.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Vehicle</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{manifest.vehicleNumber || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Driver</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{manifest.driverName || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase">Dispatched</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {new Date(manifest.dispatchedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {isIncoming && !isCompleted && (
        <button
          onClick={handleReceive}
          disabled={isReceiving}
          className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {isReceiving ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Confirm Receipt
            </>
          )}
        </button>
      )}
    </div>
  );
}
