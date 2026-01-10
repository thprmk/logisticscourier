// app/superadmin/pricing/weight-tiers/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface WeightTier {
  _id: string;
  minWeight: number;
  maxWeight: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export default function WeightTiersPage() {
  const [tiers, setTiers] = useState<WeightTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedTier, setSelectedTier] = useState<WeightTier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchTiers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pricing/weight-tiers');
      if (!response.ok) throw new Error('Failed to fetch weight tiers');
      const data = await response.json();
      setTiers(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load weight tiers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const openModal = (type: 'create' | 'edit' | 'delete', tier?: WeightTier) => {
    setModalType(type);
    if (type === 'create') {
      setMinWeight('');
      setMaxWeight('');
      setPrice('');
      setIsActive(true);
      setSelectedTier(null);
    } else if (tier) {
      setSelectedTier(tier);
      setMinWeight(tier.minWeight.toString());
      setMaxWeight(tier.maxWeight.toString());
      setPrice(tier.price.toString());
      setIsActive(tier.isActive);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTier(null);
    setMinWeight('');
    setMaxWeight('');
    setPrice('');
    setIsActive(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(modalType === 'create' ? 'Creating weight tier...' : 'Updating weight tier...');

    try {
      const url = modalType === 'create'
        ? '/api/pricing/weight-tiers'
        : `/api/pricing/weight-tiers/${selectedTier?._id}`;
      
      const method = modalType === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minWeight: parseFloat(minWeight),
          maxWeight: parseFloat(maxWeight),
          price: parseFloat(price),
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      toast.success(
        modalType === 'create' ? 'Weight tier created successfully' : 'Weight tier updated successfully',
        { id: toastId }
      );
      closeModal();
      fetchTiers();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTier) return;
    setIsSubmitting(true);
    const toastId = toast.loading('Deleting weight tier...');

    try {
      const response = await fetch(`/api/pricing/weight-tiers/${selectedTier._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }

      toast.success('Weight tier deleted successfully', { id: toastId });
      closeModal();
      fetchTiers();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#1C1C1C] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Weight Tiers
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Configure pricing based on package weight
            </p>
          </div>
          <Button
            onClick={() => openModal('create')}
            className="gap-2 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
          >
            <Plus size={18} /> Add Weight Tier
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : tiers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No weight tiers configured. Create your first tier to get started.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Min Weight (kg)</TableHead>
                  <TableHead>Max Weight (kg)</TableHead>
                  <TableHead>Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier._id}>
                    <TableCell className="font-medium">{tier.minWeight}</TableCell>
                    <TableCell>{tier.maxWeight === Infinity ? '∞' : tier.maxWeight}</TableCell>
                    <TableCell>₹{tier.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal('edit', tier)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal('delete', tier)}
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
                {modalType === 'create' ? 'Create Weight Tier' : 'Edit Weight Tier'}
              </DialogTitle>
              <DialogDescription>
                {modalType === 'create'
                  ? 'Add a new weight tier for pricing calculation'
                  : 'Update the weight tier details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minWeight">Min Weight (kg)</Label>
                    <Input
                      id="minWeight"
                      type="number"
                      step="0.01"
                      min="0"
                      value={minWeight}
                      onChange={(e) => setMinWeight(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                    <Input
                      id="maxWeight"
                      type="number"
                      step="0.01"
                      min="0"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
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
              <DialogTitle>Delete Weight Tier</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the weight tier{' '}
                <strong>{selectedTier?.minWeight} - {selectedTier?.maxWeight} kg</strong>?
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

