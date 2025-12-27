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
import { useTheme } from '../../../context/ThemeContext';
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
  const { theme } = useTheme();
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
          <div className="relative w-12 h-12 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-[#333333]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 dark:border-t-blue-400 border-r-blue-500 dark:border-r-blue-400 animate-spin" style={{ animationDuration: '0.6s' }}></div>
          </div>
          <p className="text-gray-600 dark:text-white">Loading manifest details...</p>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] p-8 text-center">
        <p className="text-gray-600 dark:text-white mb-4">{error || 'Manifest not found'}</p>
        <Button asChild variant="outline" className="dark:text-white">
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
        <Button variant="ghost" size="icon" asChild className="dark:hover:bg-[#1A3D2A] dark:hover:text-[#25D366]">
          <Link href="/dashboard/dispatch">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manifest Details</h1>
          <p className="text-sm text-gray-600 dark:text-white mt-1">ID: {manifest._id}</p>
        </div>
      </div>

      {/* Status and Summary Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Main Timeline Section */}
        <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] p-6 space-y-6">
          <div className="flex items-start justify-between">
            <Badge 
              variant={manifest.status === 'Completed' ? 'default' : 'secondary'}
              className={`text-white ${
                manifest.status === 'Completed'
                  ? 'bg-[#16A34A]'
                  : 'bg-[#3B82F6]'
              }`}
            >
              {manifest.status}
            </Badge>
          </div>

          {/* Timeline using react-vertical-timeline-component */}
          <VerticalTimeline lineColor={theme === 'dark' ? '#333333' : '#e5e7eb'}>
            {/* Step 1: Dispatched */}
            <VerticalTimelineElement
              className="vertical-timeline-element--work"
              contentStyle={{
                background: theme === 'dark' ? '#1A3D2A' : '#eff6ff',
                color: theme === 'dark' ? '#E5E5E5' : '#1f2937',
                border: theme === 'dark' ? '1px solid #333333' : '1px solid #bfdbfe',
                borderRadius: '0.5rem',
                boxShadow: 'none',
                padding: '1.5rem'
              }}
              contentArrowStyle={{
                borderRight: `7px solid ${theme === 'dark' ? '#1A3D2A' : '#eff6ff'}`
              }}
              date={new Date(manifest.dispatchedAt).toLocaleString()}
              dateClassName={theme === 'dark' ? 'text-[#A3A3A3] font-medium' : 'text-gray-600 font-medium'}
              iconStyle={{
                background: theme === 'dark' ? '#2563eb' : '#dbeafe',
                color: theme === 'dark' ? '#ffffff' : '#2563eb',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: theme === 'dark' ? '0 0 0 4px #1A3D2A' : '0 0 0 4px #f0f9ff'
              }}
              icon={<CheckCircle2 className="h-6 w-6" />}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Package Dispatched</h3>
                  <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-semibold">Step 1</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">From</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{manifest.fromBranchId?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">To</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{manifest.toBranchId?.name || 'Unknown'}</p>
                    </div>
                  </div>
                  {manifest.vehicleNumber && (
                    <div className="flex items-start gap-3 pt-2 border-t border-blue-200 dark:border-[#333333]">
                      <Truck className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">Vehicle</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{manifest.vehicleNumber}</p>
                      </div>
                    </div>
                  )}
                  {manifest.driverName && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Driver</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{manifest.driverName}</p>
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
                background: theme === 'dark' 
                  ? (manifest.status === 'Completed' ? '#1A3D2A' : '#2A2A2A')
                  : (manifest.status === 'Completed' ? '#eff6ff' : '#fffbeb'),
                color: theme === 'dark' ? '#E5E5E5' : '#1f2937',
                border: theme === 'dark'
                  ? '1px solid #333333'
                  : (manifest.status === 'Completed' ? '1px solid #bfdbfe' : '1px solid #fde68a'),
                borderRadius: '0.5rem',
                boxShadow: 'none',
                padding: '1.5rem'
              }}
              contentArrowStyle={{
                borderRight: `7px solid ${theme === 'dark' 
                  ? (manifest.status === 'Completed' ? '#1A3D2A' : '#2A2A2A')
                  : (manifest.status === 'Completed' ? '#eff6ff' : '#fffbeb')}`
              }}
              date="In Transit"
              dateClassName={theme === 'dark' ? 'text-[#A3A3A3] font-medium' : 'text-gray-600 font-medium'}
              iconStyle={{
                background: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '#2563eb' : '#eab308')
                  : (manifest.status === 'Completed' ? '#dbeafe' : '#fef3c7'),
                color: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '#ffffff' : '#ffffff')
                  : (manifest.status === 'Completed' ? '#2563eb' : '#eab308'),
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '0 0 0 4px #1A3D2A' : '0 0 0 4px #2A2A2A')
                  : (manifest.status === 'Completed' ? '0 0 0 4px #f0f9ff' : '0 0 0 4px #fef9e7'),
                border: theme === 'dark' && manifest.status !== 'Completed' ? '2px solid #eab308' : (manifest.status !== 'Completed' ? '2px solid #eab308' : 'none')
              }}
              icon={manifest.status === 'Completed' ? <CheckCircle2 className="h-6 w-6" /> : <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">In Transit</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    manifest.status === 'Completed' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    Step 2
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-[#A3A3A3] font-medium">Shipments are being transported</p>
                <p className={`text-sm font-medium ${
                  manifest.status === 'Completed'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-yellow-800 dark:text-yellow-300'
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
                background: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '#1A3D2A' : '#2A2A2A')
                  : (manifest.status === 'Completed' ? '#f0fdf4' : '#f3f4f6'),
                color: theme === 'dark' ? '#E5E5E5' : '#1f2937',
                border: theme === 'dark'
                  ? '1px solid #333333'
                  : (manifest.status === 'Completed' ? '1px solid #bbf7d0' : '1px solid #d1d5db'),
                borderRadius: '0.5rem',
                boxShadow: 'none',
                padding: '1.5rem'
              }}
              contentArrowStyle={{
                borderRight: `7px solid ${theme === 'dark'
                  ? (manifest.status === 'Completed' ? '#1A3D2A' : '#2A2A2A')
                  : (manifest.status === 'Completed' ? '#f0fdf4' : '#f3f4f6')}`
              }}
              date={manifest.receivedAt ? new Date(manifest.receivedAt).toLocaleString() : 'Pending'}
              dateClassName={theme === 'dark' ? 'text-[#A3A3A3] font-medium' : 'text-gray-600 font-medium'}
              iconStyle={{
                background: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '#16a34a' : '#6b7280')
                  : (manifest.status === 'Completed' ? '#dcfce7' : '#f3f4f6'),
                color: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '#ffffff' : '#ffffff')
                  : (manifest.status === 'Completed' ? '#16a34a' : '#9ca3af'),
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: theme === 'dark'
                  ? (manifest.status === 'Completed' ? '0 0 0 4px #1A3D2A' : '0 0 0 4px #2A2A2A')
                  : (manifest.status === 'Completed' ? '0 0 0 4px #f0fdf4' : '0 0 0 4px #f9fafb')
              }}
              icon={manifest.status === 'Completed' ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Received at Destination</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    manifest.status === 'Completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-[#A3A3A3]'
                  }`}>
                    Step 3
                  </span>
                </div>
                {manifest.receivedAt ? (
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">✓ Manifest received successfully</p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-[#A3A3A3]">Awaiting delivery confirmation</p>
                )}
              </div>
            </VerticalTimelineElement>
          </VerticalTimeline>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Shipments ({manifest.shipmentIds?.length || 0})</h2>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-[#222222] border-b-2 border-gray-200 dark:border-[#333333] hover:bg-gray-50/80 dark:hover:bg-[#222222]">
                <TableHead className="font-bold text-gray-700 dark:text-white">Tracking ID</TableHead>
                <TableHead className="font-bold text-gray-700 dark:text-white">Sender</TableHead>
                <TableHead className="font-bold text-gray-700 dark:text-white">Recipient</TableHead>
                <TableHead className="font-bold text-gray-700 dark:text-white">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manifest.shipmentIds?.map((shipment: IShipment) => (
                <TableRow key={shipment._id} className="hover:bg-gray-50 dark:hover:bg-[#1A3D2A] border-b border-gray-100 dark:border-[#333333]">
                  <TableCell className="font-semibold text-gray-900 dark:text-[#E5E5E5]">{shipment.trackingId}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{shipment.sender?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-[#A3A3A3]">{shipment.sender?.address || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{shipment.recipient?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 dark:text-[#A3A3A3]">{shipment.recipient?.address || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`text-white ${
                        shipment.status === 'Delivered'
                          ? 'bg-[#16A34A]'
                          : shipment.status === 'At Destination Branch'
                            ? 'bg-[#3B82F6]'
                            : 'bg-[#F97316]'
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
