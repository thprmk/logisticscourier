// app/superadmin/pricing/corporate-clients/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Building2, Mail, Phone, MapPin } from 'lucide-react';
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

interface CorporateClient {
  _id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  creditLimit?: number;
  paymentTerms?: string;
  outstandingAmount: number;
  isActive: boolean;
  createdAt: string;
}

export default function CorporateClientsPage() {
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedClient, setSelectedClient] = useState<CorporateClient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/pricing/corporate-clients');
      if (!response.ok) throw new Error('Failed to fetch corporate clients');
      const data = await response.json();
      setClients(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load corporate clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openModal = (type: 'create' | 'edit' | 'delete', client?: CorporateClient) => {
    setModalType(type);
    if (type === 'create') {
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCreditLimit('');
      setPaymentTerms('');
      setIsActive(true);
      setSelectedClient(null);
    } else if (client) {
      setSelectedClient(client);
      setCompanyName(client.companyName);
      setContactPerson(client.contactPerson);
      setEmail(client.email);
      setPhone(client.phone);
      setAddress(client.address);
      setCreditLimit(client.creditLimit?.toString() || '');
      setPaymentTerms(client.paymentTerms || '');
      setIsActive(client.isActive);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedClient(null);
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCreditLimit('');
    setPaymentTerms('');
    setIsActive(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading(modalType === 'create' ? 'Creating corporate client...' : 'Updating corporate client...');

    try {
      const url = modalType === 'create'
        ? '/api/pricing/corporate-clients'
        : `/api/pricing/corporate-clients/${selectedClient?._id}`;
      
      const method = modalType === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
          paymentTerms: paymentTerms.trim() || undefined,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed');
      }

      toast.success(
        modalType === 'create' ? 'Corporate client created successfully' : 'Corporate client updated successfully',
        { id: toastId }
      );
      closeModal();
      fetchClients();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    const toastId = toast.loading('Deleting corporate client...');

    try {
      const response = await fetch(`/api/pricing/corporate-clients/${selectedClient._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed');
      }

      toast.success('Corporate client deleted successfully', { id: toastId });
      closeModal();
      fetchClients();
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
              Corporate Clients
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Manage post-paid corporate clients and their credit limits
            </p>
          </div>
          <Button
            onClick={() => openModal('create')}
            className="gap-2 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
          >
            <Plus size={18} /> Add Client
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No corporate clients configured. Create your first client to get started.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-[#333333] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const creditUsed = client.creditLimit
                    ? (client.outstandingAmount / client.creditLimit) * 100
                    : 0;
                  const isOverLimit = client.creditLimit && client.outstandingAmount > client.creditLimit;

                  return (
                    <TableRow key={client._id}>
                      <TableCell className="font-medium">{client.companyName}</TableCell>
                      <TableCell>{client.contactPerson}</TableCell>
                      <TableCell className="text-sm">{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>
                        {client.creditLimit ? `₹${client.creditLimit.toLocaleString()}` : 'No limit'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={isOverLimit ? 'text-red-600 font-medium' : ''}>
                            ₹{client.outstandingAmount.toLocaleString()}
                          </span>
                          {client.creditLimit && (
                            <span className="text-xs text-gray-500">
                              {creditUsed.toFixed(1)}% used
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.isActive ? 'default' : 'secondary'}>
                          {client.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal('edit', client)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal('delete', client)}
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {modalType === 'create' ? 'Create Corporate Client' : 'Edit Corporate Client'}
              </DialogTitle>
              <DialogDescription>
                {modalType === 'create'
                  ? 'Add a new corporate client for post-paid billing'
                  : 'Update the corporate client details'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Input
                      id="paymentTerms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="e.g., Net 30"
                    />
                  </div>
                </div>
                {modalType === 'edit' && selectedClient && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium mb-1">Current Outstanding:</p>
                    <p className="text-lg font-semibold">₹{selectedClient.outstandingAmount.toLocaleString()}</p>
                  </div>
                )}
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
              <DialogTitle>Delete Corporate Client</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedClient?.companyName}</strong>?
                {selectedClient && selectedClient.outstandingAmount > 0 && (
                  <span className="block mt-2 text-red-600">
                    Warning: This client has an outstanding amount of ₹{selectedClient.outstandingAmount.toLocaleString()}.
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

