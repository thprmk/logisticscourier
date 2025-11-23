'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader, MapPin, Calendar, Truck, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface IShipment {
  _id: string;
  trackingId: string;
  sender: { name: string; address: string; phone: string };
  recipient: { name: string; address: string; phone: string };
  status: string;
  originBranchId: { _id: string; name: string };
  destinationBranchId: { _id: string; name: string };
  currentBranchId: string;
  createdAt: string;
}

interface IManifest {
  _id: string;
  fromBranchId: { _id: string; name: string };
  toBranchId: { _id: string; name: string };
  shipmentIds: IShipment[];
  status: 'In Transit' | 'Completed';
  vehicleNumber?: string;
  driverName?: string;
  dispatchedAt: string;
  receivedAt?: string;
  notes?: string;
}

export default function ManifestDetailPage() {
  const params = useParams();
  const manifestId = params.manifestId as string;
  const [manifest, setManifest] = useState<IManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/manifests/${manifestId}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch manifest');
        const data = await response.json();
        setManifest(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        toast.error('Failed to load manifest details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();
  }, [manifestId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600">Loading manifest details...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-4">{error || 'Manifest not found'}</p>
        <Link href="/dashboard/dispatch" className="text-blue-600 hover:text-blue-700 font-semibold">
          ← Back to Dispatch
        </Link>
      </div>
    );
  }

  const isCompleted = manifest.status === 'Completed';
  const dispatchDate = new Date(manifest.dispatchedAt).toLocaleString();
  const receivedDate = manifest.receivedAt ? new Date(manifest.receivedAt).toLocaleString() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/dispatch" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manifest Details</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {manifest._id}</p>
        </div>
      </div>

      {/* Status and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manifest Status</h2>
              <p className="text-sm text-gray-600 mt-1">Track the transfer progress</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {manifest.status}
            </span>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            {/* Dispatch Step */}
            <div className="flex gap-4">
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold z-10">
                  1
                </div>
                {isCompleted && <div className="absolute top-10 w-1 h-12 bg-green-500"></div>}
              </div>
              <div className="pb-6">
                <h3 className="font-bold text-gray-900">Package Dispatched</h3>
                <p className="text-sm text-gray-600 mt-1">{dispatchDate}</p>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-600" />
                    <span><strong>From:</strong> {manifest.fromBranchId.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-600" />
                    <span><strong>To:</strong> {manifest.toBranchId.name}</span>
                  </div>
                  {manifest.vehicleNumber && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-600" />
                      <span><strong>Vehicle:</strong> {manifest.vehicleNumber}</span>
                    </div>
                  )}
                  {manifest.driverName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span><strong>Driver:</strong> {manifest.driverName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transit Step */}
            <div className="flex gap-4">
              <div className="relative flex flex-col items-center">
                <div className={`w-10 h-10 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'} rounded-full flex items-center justify-center text-white font-bold z-10`}>
                  2
                </div>
                {isCompleted && <div className="absolute top-10 w-1 h-12 bg-green-500"></div>}
              </div>
              <div className="pb-6">
                <h3 className="font-bold text-gray-900">In Transit</h3>
                <p className="text-sm text-gray-600 mt-1">Shipments are being transported</p>
              </div>
            </div>

            {/* Received Step */}
            <div className="flex gap-4">
              <div className="relative flex flex-col items-center">
                <div className={`w-10 h-10 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'} rounded-full flex items-center justify-center text-white font-bold z-10`}>
                  3
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Received at Destination</h3>
                {receivedDate ? (
                  <p className="text-sm text-gray-600 mt-1">{receivedDate}</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Waiting for confirmation...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 h-fit">
          <h3 className="font-bold text-gray-900 mb-4">Manifest Summary</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{manifest.shipmentIds.length}</p>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Route</p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-gray-900 font-semibold">{manifest.fromBranchId.name}</p>
                <div className="flex items-center justify-center h-6 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <p className="text-gray-900 font-semibold">{manifest.toBranchId.name}</p>
              </div>
            </div>
            {manifest.notes && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Notes</p>
                <p className="text-sm text-gray-700 mt-2">{manifest.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipments List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Shipments ({manifest.shipmentIds.length})</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Tracking ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Sender</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Recipient</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {manifest.shipmentIds.map((shipment: IShipment) => (
                <tr key={shipment._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-gray-900">{shipment.trackingId}</td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{shipment.sender.name}</p>
                      <p className="text-xs text-gray-500">{shipment.sender.address}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{shipment.recipient.name}</p>
                      <p className="text-xs text-gray-500">{shipment.recipient.address}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      shipment.status === 'Delivered'
                        ? 'bg-green-100 text-green-700'
                        : shipment.status === 'At Destination Branch'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {shipment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
