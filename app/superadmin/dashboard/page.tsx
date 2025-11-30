// app/superadmin/dashboard/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Building, Edit, Trash2, Eye, EyeOff, Users, TrendingUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';


// Define TypeScript interfaces
interface AdminInfo {
  name: string;
  email: string;
}

interface Tenant { _id: string; name: string; createdAt: string; admin?: AdminInfo; }

export default function SuperAdminDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Simplified Modal State: 'view' is removed
  const [modalType, setModalType] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  
  // State for forms
  const [branchName, setBranchName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tenants');
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const data = await response.json();
      setTenants(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const totalTenants = tenants.length;
  const tenantsThisMonth = tenants.filter(t => {
    const created = new Date(t.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;
  const activeTenants = tenants.length; // All tenants are considered active
  
  useEffect(() => { fetchTenants(); }, []);

  // ... existing code ...

  // Calculate pagination values
  const totalPages = Math.ceil(tenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenants = tenants.slice(startIndex, endIndex);

  // Filter tenants based on search query
  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.admin?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.admin?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Recalculate pagination with filtered data
  const filteredTotalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const filteredStartIndex = (currentPage - 1) * itemsPerPage;
  const filteredEndIndex = filteredStartIndex + itemsPerPage;
  const filteredPaginatedTenants = filteredTenants.slice(filteredStartIndex, filteredEndIndex);

  // ... existing code ...

  const resetForms = () => {
    setBranchName('');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setSelectedTenant(null);
  };
  
  // Simplified Modal Opener
  const openModal = (type: 'create' | 'edit' | 'delete', tenant?: Tenant) => {
    resetForms();
    setModalType(type);
    if (tenant) {
        setSelectedTenant(tenant);
        if (type === 'edit') {
            setBranchName(tenant.name); // Pre-fill the form for editing
            setAdminName(tenant.admin?.name || ''); 
            setAdminEmail(tenant.admin?.email || '');
        }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setShowPassword(false);
    resetForms();
  };

  // CRUD handlers (no changes to internal logic)
  const handleCreateTenant = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Creating new branch...');
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName, adminName, adminEmail, adminPassword }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
     toast.success(`Branch "${branchName}" was created successfully.`, { id: toastId });
      closeModal();
      setCurrentPage(1);
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTenant = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTenant) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Updating ${branchName}...`);
    try {
        const updateData: any = { 
            name: branchName,
            adminName,
            adminEmail
        };
        
        // Only include password if it's been entered
        if (adminPassword) {
            updateData.adminPassword = adminPassword;
        }
        
        const res = await fetch(`/api/tenants/${selectedTenant._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
        toast.success(`Branch "${branchName}" was updated successfully.`, { id: toastId });
        closeModal();
        setCurrentPage(1);
        fetchTenants();
    } catch (error: any) {
        toast.error(error.message, { id: toastId });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    setIsSubmitting(true);
    const toastId = toast.loading(`Deleting ${selectedTenant.name}...`);
    try {
        const res = await fetch(`/api/tenants/${selectedTenant._id}`, { method: 'DELETE' });
        if (!res.ok) { const data = await res.json(); throw new Error(data.message); }
       toast.success(`Branch "${selectedTenant.name}" was deleted successfully.`, { id: toastId });
        closeModal();
        setCurrentPage(1);
        fetchTenants();
    } catch (error: any) {
        toast.error(error.message, { id: toastId });
    } finally { 
        setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-blue-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Branches</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{totalTenants}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">This Month</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{tenantsThisMonth}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-purple-200 p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Admins</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{tenants.filter(t => t.admin).length}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Branches Dashboard</h1>
          <p className="text-gray-500 mt-1">Create, edit, and manage all branches on the platform.</p>
        </div>
      </div>

      {/* Search Bar and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        <Button onClick={() => openModal('create')} className="gap-2 whitespace-nowrap">
          <Plus size={18} /> Add New Branch
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">S/No</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Details</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Admin</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</TableHead>
              <TableHead className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10"></TableCell>
              </TableRow>
            ) : filteredTenants.length > 0 ? (
              filteredPaginatedTenants.map((tenant, index) => (
                <TableRow key={tenant._id} className="hover:bg-gray-50">
                  <TableCell className="text-sm text-gray-500">{filteredStartIndex + index + 1}</TableCell>
                  <TableCell><div className="text-sm font-semibold text-gray-900">{tenant.name}</div></TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{tenant.admin?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{tenant.admin?.email || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right text-sm font-medium space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('edit', tenant)}
                      title="Edit Branch"
                      className="text-gray-400 hover:text-indigo-600"
                    >
                      <Edit size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openModal('delete', tenant)}
                      title="Delete Branch"
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">No branches have been created yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredTotalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {filteredTenants.length > 0 ? filteredStartIndex + 1 : 0} to {Math.min(filteredEndIndex, filteredTenants.length)} of {filteredTenants.length} branches
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: filteredTotalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-[40px]"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(filteredTotalPages, currentPage + 1))}
              disabled={currentPage === filteredTotalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* --- MODALS --- */}
            {modalType === 'create' && (
    <Dialog open={true} onOpenChange={closeModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Branch</DialogTitle>
          <DialogDescription>Fill in the details below to set up a new branch and its administrator.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleCreateTenant} autoComplete="off" className="space-y-6">
          {/* ... existing code ... */}
          <div>
            <Label htmlFor="branchName" className="text-sm font-medium">Branch Name</Label>
            <Input
              id="branchName"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoComplete="off"
              required
              className="mt-2"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-medium">Administrator Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminName" className="text-sm font-medium">Admin Full Name</Label>
                <Input
                  id="adminName"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  autoComplete="off"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail" className="text-sm font-medium">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  autoComplete="off"
                  required
                  className="mt-2"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adminPassword" className="text-sm font-medium">Temporary Password</Label>
              <div className="relative mt-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="adminPassword"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
)}

{modalType === 'edit' && selectedTenant && (
    <Dialog open={true} onOpenChange={closeModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Branch</DialogTitle>
          <DialogDescription>Update details for <span className="font-medium">{selectedTenant.name}</span>.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleEditTenant} autoComplete="off" className="space-y-6">
          {/* ... existing code ... */}
          <div>
            <Label htmlFor="editBranchName" className="text-sm font-medium">Branch Name</Label>
            <Input
              id="editBranchName"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoComplete="off"
              required
              className="mt-2"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-medium">Administrator Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editAdminName" className="text-sm font-medium">Admin Full Name</Label>
                <Input
                  id="editAdminName"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  autoComplete="off"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="editAdminEmail" className="text-sm font-medium">Admin Email</Label>
                <Input
                  id="editAdminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  autoComplete="off"
                  required
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editAdminPassword" className="text-sm font-medium">Reset Password</Label>
              <div className="relative mt-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="editAdminPassword"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-400">Only enter a new password if you want to change it.</p>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
)}



{modalType === 'delete' && selectedTenant && (
    <Dialog open={true} onOpenChange={closeModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 flex-shrink-0">
              <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <div className="text-left">
              <DialogTitle>Delete Branch</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this branch?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <p className="text-sm text-red-700">
            You are about to delete the branch <strong className="font-semibold">{selectedTenant.name}</strong>. All of this branch's data, including users and shipments, will be permanently removed. <strong className="font-semibold">This action cannot be undone.</strong>
          </p>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteTenant} disabled={isSubmitting}>
            {isSubmitting ? 'Deleting...' : 'Delete Branch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
)}
    </div>
  );
}