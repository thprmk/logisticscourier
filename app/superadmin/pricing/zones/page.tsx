// app/superadmin/pricing/zones/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  description?: string;
  isActive: boolean;
  branches?: Array<{ _id: string; name: string }>;
  createdAt: string;
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchZones = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pricing/zones');
      if (!response.ok) throw new Error('Failed to fetch zones');
      const data = await response.json();
      setZones(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load zones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const openModal = (type: 'create' | 'edit' | 'delete', zone?: Zone) => {
    setModalType(type);
    if (type === 'create') {
      setName('');
      setDescription('');
      setIsActive(true);
      setSelectedZone(null);
    } else if (zone) {
      setSelectedZone(zone);
      setName(zone.name);
      setDescription(zone.description || '');
      setIsActive(zone.isActive);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedZone(null);
    setName('');
    setDescription('');
    setIsActive(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(modalType === 'create' ? 'Creating zone...' : 'Updating zone...');

    try {
      const url = modalType === 'create'
        ? '/api/pricing/zones'
        : `/api/pricing/zones/${selectedZone?._id}`;
      
      const method = modalType === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      toast.success(
        modalType === 'create' ? 'Zone created successfully' : 'Zone updated successfully',
        { id: toastId }
      );
      closeModal();
      fetchZones();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedZone) return;
    setIsSubmitting(true);
    const toastId = toast.loading('Deleting zone...');

    try {
      const response = await fetch(`/api/pricing/zones/${selectedZone._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }

      toast.success('Zone deleted successfully', { id: toastId });
      closeModal();
      fetchZones();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchZoneDetails = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/pricing/zones/${zoneId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedZone(data);
      }
    } catch (error) {
      console.error('Error fetching zone details:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#1C1C1C] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Zones
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage zones for branch grouping and surcharge calculation
            </p>
          </div>
          <Button
            onClick={() => openModal('create')}
            className="gap-2 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
          >
            <Plus size={18} /> Add Zone
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : zones.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No zones configured. Create your first zone to get started.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone._id}>
                    <TableCell className="font-medium">{zone.name}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {zone.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          fetchZoneDetails(zone._id);
                          openModal('edit', zone);
                        }}
                        className="gap-1"
                      >
                        <Building2 size={14} />
                        View Branches
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.isActive ? 'default' : 'secondary'}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            fetchZoneDetails(zone._id);
                            openModal('edit', zone);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            fetchZoneDetails(zone._id);
                            openModal('delete', zone);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={modalType === 'create' || modalType === 'edit'} onOpenChange={closeModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {modalType === 'create' ? 'Create Zone' : 'Edit Zone'}
              </DialogTitle>
              <DialogDescription>
                {modalType === 'create'
                  ? 'Add a new zone for branch grouping'
                  : 'Update the zone details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Zone Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Central Zone, Metro Zone"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Zone description..."
                    rows={3}
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
                {modalType === 'edit' && selectedZone?.branches && selectedZone.branches.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium mb-2">Assigned Branches:</p>
                    <ul className="text-sm space-y-1">
                      {selectedZone.branches.map((branch) => (
                        <li key={branch._id}>• {branch.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
              <DialogTitle>Delete Zone</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the zone <strong>{selectedZone?.name}</strong>?
                {selectedZone?.branches && selectedZone.branches.length > 0 && (
                  <span className="block mt-2 text-red-600">
                    Warning: {selectedZone.branches.length} branch(es) are assigned to this zone.
                  </span>
                )}
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

