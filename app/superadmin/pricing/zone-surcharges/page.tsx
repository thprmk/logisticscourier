// app/superadmin/pricing/zone-surcharges/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface Zone {
  _id: string;
  name: string;
}

interface ZoneSurcharge {
  _id: string;
  fromZoneId: string | Zone;
  toZoneId: string | Zone;
  surcharge: number;
  isActive: boolean;
  createdAt: string;
}

export default function ZoneSurchargesPage() {
  const [surcharges, setSurcharges] = useState<ZoneSurcharge[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedSurcharge, setSelectedSurcharge] = useState<ZoneSurcharge | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fromZoneId, setFromZoneId] = useState('');
  const [toZoneId, setToZoneId] = useState('');
  const [surcharge, setSurcharge] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/pricing/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.filter((z: Zone) => z.isActive));
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchSurcharges = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pricing/zone-surcharges');
      if (!response.ok) throw new Error('Failed to fetch zone surcharges');
      const data = await response.json();
      setSurcharges(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load zone surcharges');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchSurcharges();
  }, []);

  const openModal = (type: 'create' | 'edit' | 'delete', surchargeItem?: ZoneSurcharge) => {
    setModalType(type);
    if (type === 'create') {
      setFromZoneId('');
      setToZoneId('');
      setSurcharge('');
      setIsActive(true);
      setSelectedSurcharge(null);
    } else if (surchargeItem) {
      setSelectedSurcharge(surchargeItem);
      const fromZone = typeof surchargeItem.fromZoneId === 'object' ? surchargeItem.fromZoneId._id : surchargeItem.fromZoneId;
      const toZone = typeof surchargeItem.toZoneId === 'object' ? surchargeItem.toZoneId._id : surchargeItem.toZoneId;
      setFromZoneId(fromZone);
      setToZoneId(toZone);
      setSurcharge(surchargeItem.surcharge.toString());
      setIsActive(surchargeItem.isActive);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedSurcharge(null);
    setFromZoneId('');
    setToZoneId('');
    setSurcharge('');
    setIsActive(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(modalType === 'create' ? 'Creating zone surcharge...' : 'Updating zone surcharge...');

    try {
      const url = modalType === 'create'
        ? '/api/pricing/zone-surcharges'
        : `/api/pricing/zone-surcharges/${selectedSurcharge?._id}`;
      
      const method = modalType === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromZoneId,
          toZoneId,
          surcharge: parseFloat(surcharge),
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      toast.success(
        modalType === 'create' ? 'Zone surcharge created successfully' : 'Zone surcharge updated successfully',
        { id: toastId }
      );
      closeModal();
      fetchSurcharges();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSurcharge) return;
    setIsSubmitting(true);
    const toastId = toast.loading('Deleting zone surcharge...');

    try {
      const response = await fetch(`/api/pricing/zone-surcharges/${selectedSurcharge._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }

      toast.success('Zone surcharge deleted successfully', { id: toastId });
      closeModal();
      fetchSurcharges();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getZoneName = (zoneId: string | Zone): string => {
    if (typeof zoneId === 'object') return zoneId.name;
    const zone = zones.find(z => z._id === zoneId);
    return zone?.name || 'Unknown';
  };

  const isSameZone = (from: string | Zone, to: string | Zone): boolean => {
    const fromId = typeof from === 'object' ? from._id : from;
    const toId = typeof to === 'object' ? to._id : to;
    return fromId === toId;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#1C1C1C] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Zone Surcharges
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Configure surcharges for shipping between zones
            </p>
          </div>
          <Button
            onClick={() => openModal('create')}
            className="gap-2 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
          >
            <Plus size={18} /> Add Surcharge
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : surcharges.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No zone surcharges configured. Create your first surcharge to get started.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From Zone</TableHead>
                  <TableHead></TableHead>
                  <TableHead>To Zone</TableHead>
                  <TableHead>Surcharge (₹)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surcharges.map((surchargeItem) => {
                  const sameZone = isSameZone(surchargeItem.fromZoneId, surchargeItem.toZoneId);
                  return (
                    <TableRow key={surchargeItem._id}>
                      <TableCell className="font-medium">
                        {getZoneName(surchargeItem.fromZoneId)}
                      </TableCell>
                      <TableCell>
                        <ArrowRight size={16} className="text-gray-400" />
                      </TableCell>
                      <TableCell className="font-medium">
                        {getZoneName(surchargeItem.toZoneId)}
                      </TableCell>
                      <TableCell>₹{surchargeItem.surcharge.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={sameZone ? 'default' : 'secondary'}>
                          {sameZone ? 'Same Zone' : 'Different Zone'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={surchargeItem.isActive ? 'default' : 'secondary'}>
                          {surchargeItem.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal('edit', surchargeItem)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal('delete', surchargeItem)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {modalType === 'create' ? 'Create Zone Surcharge' : 'Edit Zone Surcharge'}
              </DialogTitle>
              <DialogDescription>
                {modalType === 'create'
                  ? 'Set the surcharge for shipping between zones'
                  : 'Update the zone surcharge'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromZoneId">From Zone</Label>
                    <Select value={fromZoneId} onValueChange={setFromZoneId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem key={zone._id} value={zone._id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toZoneId">To Zone</Label>
                    <Select value={toZoneId} onValueChange={setToZoneId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem key={zone._id} value={zone._id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {fromZoneId && toZoneId && fromZoneId === toZoneId && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    Same zone surcharge (intra-zone shipping)
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="surcharge">Surcharge (₹)</Label>
                  <Input
                    id="surcharge"
                    type="number"
                    step="0.01"
                    min="0"
                    value={surcharge}
                    onChange={(e) => setSurcharge(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#1A9D4A] hover:bg-[#158A3F]">
                  {isSubmitting ? 'Saving...' : modalType === 'create' ? 'Create' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={modalType === 'delete'} onOpenChange={closeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Zone Surcharge</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the surcharge from{' '}
                <strong>{selectedSurcharge && getZoneName(selectedSurcharge.fromZoneId)}</strong> to{' '}
                <strong>{selectedSurcharge && getZoneName(selectedSurcharge.toZoneId)}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

