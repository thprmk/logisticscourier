'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader, MapPin, Calendar, Truck, User, CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// @ts-ignore
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';

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
          <Loader className="h-12 w-12 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Loading manifest details...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-4">{error || 'Manifest not found'}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/dispatch" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dispatch
          </Link>
        </Button>
      </div>
    );
  }

  const isCompleted = manifest.status === 'Completed';
  const dispatchDate = new Date(manifest.dispatchedAt).toLocaleString();
  const receivedDate = manifest.receivedAt ? new Date(manifest.receivedAt).toLocaleString() : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/dispatch">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manifest Details</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {manifest._id}</p>
        </div>
      </div>

      {/* Status and Summary Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Main Timeline Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <Badge 
              variant={manifest.status === 'Completed' ? 'default' : 'secondary'}
              className={`${
                manifest.status === 'Completed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {manifest.status}
            </Badge>
          </div>

          {/* Timeline using react-vertical-timeline-component */}
          <VerticalTimeline lineColor="#e5e7eb">
            {/* Step 1: Dispatched */}
            <VerticalTimelineElement
              className="vertical-timeline-element--work"
              contentStyle={{
                background: '#eff6ff',
                color: '#1f2937',
                border: '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                boxShadow: 'none',
                padding: '1.5rem'
              }}
              contentArrowStyle={{
                borderRight: '7px solid #eff6ff'
              }}
              date={new Date(manifest.dispatchedAt).toLocaleString()}
              dateClassName="text-gray-600 font-medium"
              iconStyle={{
                background: '#dbeafe',
                color: '#2563eb',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 4px #f0f9ff'
              }}
              icon={<CheckCircle2 className="h-6 w-6" />}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">Package Dispatched</h3>
                  <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">Step 1</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">From</p>
                      <p className="text-sm font-bold text-gray-900">{manifest.fromBranchId?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">To</p>
                      <p className="text-sm font-bold text-gray-900">{manifest.toBranchId?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  {manifest.vehicleNumber && (
                    <div className="flex items-start gap-3 pt-2 border-t border-blue-200">
                      <Truck className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Vehicle</p>
                        <p className="text-sm font-bold text-gray-900">{manifest.vehicleNumber}</p>
                      </div>
                    </div>
                  )}
                  {manifest.driverName && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Driver</p>
                        <p className="text-sm font-bold text-gray-900">{manifest.driverName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </VerticalTimelineElement>

            {/* Step 2: In Transit */}
            <VerticalTimelineElement
              className="vertical-timeline-element--work"
              contentStyle={{
                background: manifest.status === 'Completed' ? '#eff6ff' : '#fffbeb',
                color: '#1f2937',
                border: manifest.status === 'Completed' ? '1px solid #bfdbfe' : '1px solid #fde68a',
                borderRadius: '0.5rem',
                boxShadow: 'none',
                padding: '1.5rem'
              }}
              contentArrowStyle={{
                borderRight: `7px solid ${manifest.status === 'Completed' ? '#eff6ff' : '#fffbeb'}`
              }}
              date="In Transit"
              dateClassName="text-gray-600 font-medium"
              iconStyle={{
                background: manifest.status === 'Completed' ? '#dbeafe' : '#fef3c7',
                color: manifest.status === 'Completed' ? '#2563eb' : '#eab308',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: manifest.status === 'Completed' ? '0 0 0 4px #f0f9ff' : '0 0 0 4px #fef9e7',
                border: manifest.status !== 'Completed' ? '2px solid #eab308' : 'none'
              }}
              icon={manifest.status === 'Completed' ? <CheckCircle2 className="h-6 w-6" /> : <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">In Transit</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    manifest.status === 'Completed' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    Step 2
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">Shipments are being transported</p>
                <p className={`text-sm font-medium ${
                  manifest.status === 'Completed'
                    ? 'text-blue-700'
                    : 'text-yellow-800'
                }`}>
                  {manifest.status === 'Completed'
                    ? '✓ Successfully transported'
                    : 'Currently in transit to destination'}
                </p>
              </div>
            </VerticalTimelineElement>

            {/* Step 3: Received */}
            <VerticalTimelineElement
              className="vertical-timeline-element--work"
              contentStyle={{
                background: manifest.status === 'Completed' ? '#f0fdf4' : '#f3f4f6',
                color: '#1f2937',
                border: manifest.status === 'Completed' ? '1px solid #bbf7d0' : '1px solid #d1d5db',
                borderRadius: '0.5rem',
                boxShadow: 'none',
                padding: '1.5rem'
              }}
              contentArrowStyle={{
                borderRight: `7px solid ${manifest.status === 'Completed' ? '#f0fdf4' : '#f3f4f6'}`
              }}
              date={manifest.receivedAt ? new Date(manifest.receivedAt).toLocaleString() : 'Pending'}
              dateClassName="text-gray-600 font-medium"
              iconStyle={{
                background: manifest.status === 'Completed' ? '#dcfce7' : '#f3f4f6',
                color: manifest.status === 'Completed' ? '#16a34a' : '#9ca3af',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: manifest.status === 'Completed' ? '0 0 0 4px #f0fdf4' : '0 0 0 4px #f9fafb'
              }}
              icon={manifest.status === 'Completed' ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">Received at Destination</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    manifest.status === 'Completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    Step 3
                  </span>
                </div>
                {manifest.receivedAt ? (
                  <p className="text-sm font-bold text-green-700">✓ Manifest received successfully</p>
                ) : (
                  <p className="text-sm text-gray-600">Awaiting delivery confirmation</p>
                )}
              </div>
            </VerticalTimelineElement>
          </VerticalTimeline>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Shipments ({manifest.shipmentIds?.length || 0})</h2>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manifest.shipmentIds?.map((shipment: IShipment) => (
                <TableRow key={shipment._id} className="hover:bg-gray-50">
                  <TableCell className="font-semibold text-gray-900">{shipment.trackingId}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{shipment.sender?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{shipment.sender?.address || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{shipment.recipient?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{shipment.recipient?.address || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`${
                        shipment.status === 'Delivered'
                          ? 'bg-green-100 text-green-700'
                          : shipment.status === 'At Destination Branch'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {shipment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>

  );
}
