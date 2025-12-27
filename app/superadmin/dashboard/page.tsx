// app/superadmin/dashboard/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Building, Edit, Trash2, Eye, EyeOff, Users, CheckCircle, AlertCircle, Search, Filter, X } from 'lucide-react';
import { StatCard } from '@/app/dashboard/DashboardComponents';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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
  const [statsLoading, setStatsLoading] = useState(false);

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
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | 'last7' | 'last30' | 'last3months' | 'lastyear' | 'all'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Stats state
  const [totalStaff, setTotalStaff] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

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

  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let start: Date | null = null;
    let end: Date | null = null;

    switch (dateRangeFilter) {
      case 'today':
        start = new Date(today);
        end = tomorrow;
        break;
      case 'last7':
        start = new Date(today);
        start.setDate(start.getDate() - 6); // 7 days total (today + 6 days back)
        end = tomorrow;
        break;
      case 'last30':
        start = new Date(today);
        start.setDate(start.getDate() - 29); // 30 days total
        end = tomorrow;
        break;
      case 'last3months':
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        start.setDate(1); // Start from first day of that month
        end = tomorrow;
        break;
      case 'lastyear':
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        start.setMonth(0, 1); // January 1st of last year
        end = tomorrow;
        break;
      case 'all':
        // No date filtering
        break;
    }

    return { start, end };
  };

  // Fetch stats (total staff, delivered, failed) with filters
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      // Build query parameters based on current filters
      const params = new URLSearchParams();

      if (branchFilter && branchFilter !== 'all') {
        params.append('branchId', branchFilter);
      }

      // Get date range from filter (only send if date range is not 'all')
      const { start, end } = getDateRange();
      if (dateRangeFilter !== 'all' && start && end) {
        params.append('dateFrom', start.toISOString());
        params.append('dateTo', end.toISOString());
      }

      const queryString = params.toString();
      const url = `/api/superadmin/stats${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setTotalStaff(data.totalStaff || 0);
      setDeliveredCount(data.deliveredCount || 0);
      setFailedCount(data.failedCount || 0);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      toast.error('Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchStats(); // Initial fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch stats when filters change (but not when searchQuery changes)
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter, dateRangeFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateRangeFilter, branchFilter]);

  // ... existing code ...

  // Calculate pagination values
  const totalPages = Math.ceil(tenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenants = tenants.slice(startIndex, endIndex);

  // Filter tenants based on search query, branch filter, and date range
  const filteredTenants = tenants.filter(tenant => {
    // Search filter
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.admin?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.admin?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    // Branch filter
    const matchesBranch = branchFilter === 'all' || tenant._id === branchFilter;

    // Date range filter
    const { start, end } = getDateRange();
    let matchesDate = true;
    if (start && end) {
      const tenantDate = new Date(tenant.createdAt);
      tenantDate.setHours(0, 0, 0, 0);
      matchesDate = tenantDate >= start && tenantDate < end;
    }

    return matchesSearch && matchesBranch && matchesDate;
  });

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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#1C1C1C]">
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Add New Branch Button */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Branches Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Create, edit, and manage all branches on the platform.</p>
          </div>
          <Button onClick={() => openModal('create')} className="gap-2 whitespace-nowrap h-10 sm:h-11 bg-[#1A9D4A] hover:bg-[#158A3F] text-white">
            <Plus size={18} /> Add New Branch
          </Button>
        </div>

        {/* Filter Panel - Search, Filter by Branch, Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
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
              className="pl-10 h-10 sm:h-9 text-sm touch-manipulation"
            />
          </div>

          {/* Filter by Branch */}
          <div className="w-full sm:w-40">
            <Label htmlFor="filter-branch" className="text-xs font-medium text-gray-700 dark:text-[#E5E5E5] block mb-1">Filter by Branch</Label>
            <Select value={branchFilter} onValueChange={(value) => {
              setBranchFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger id="filter-branch" className="h-8 text-xs w-full touch-manipulation">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Branches</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="w-full sm:w-40">
            <Label htmlFor="filter-date" className="text-xs font-medium text-gray-700 dark:text-[#E5E5E5] block mb-1">Date Range</Label>
            <Select value={dateRangeFilter} onValueChange={(value: any) => {
              setDateRangeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger id="filter-date" className="h-8 text-xs w-full touch-manipulation">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="last3months">Last 3 Months</SelectItem>
                <SelectItem value="lastyear">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {(branchFilter !== 'all' || dateRangeFilter !== 'all') && (
            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBranchFilter('all');
                  setDateRangeFilter('all');
                  setCurrentPage(1);
                }}
                className="h-8 text-xs border-gray-300 hover:bg-gray-50 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Branches"
            value={totalTenants}
            icon={Building}
            color="blue"
          />
          <StatCard
            label="Total Staff"
            value={totalStaff}
            icon={Users}
            color="purple"
          />
          <StatCard
            label="Delivered"
            value={deliveredCount}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            label="Failed"
            value={failedCount}
            icon={AlertCircle}
            color="red"
          />
        </div>

        {/* Branches Table */}
        <div className="hidden md:block table-container border border-gray-200 dark:border-transparent rounded-lg bg-white dark:bg-[#222222]">
          <Table className="text-base w-full table-auto">
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-[#1C1C1C]/50 border-b border-gray-200 dark:border-gray-700/50">
                <TableHead className="w-12 px-2 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">S/No</TableHead>
                <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Branch Details</TableHead>
                <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Branch Admin</TableHead>
                <TableHead className="px-2 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Created On</TableHead>
                <TableHead className="w-24 px-2 py-2.5 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="relative w-8 h-8 mb-3">
                        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-[#333333]"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-600 dark:border-t-green-500 border-r-green-600 dark:border-r-green-500 animate-spin" style={{ animationDuration: '0.6s' }}></div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTenants.length > 0 ? (
                filteredPaginatedTenants.map((tenant, index) => (
                  <TableRow key={tenant._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-[#0F0F0F]/50 transition-colors">
                    <TableCell className="px-2 py-2.5 font-medium text-sm text-gray-900 dark:text-white">{filteredStartIndex + index + 1}</TableCell>
                    <TableCell className="px-2 py-2.5">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">{tenant.name}</div>
                    </TableCell>
                    <TableCell className="px-2 py-2.5">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">{tenant.admin?.name || 'N/A'}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">{tenant.admin?.email || 'N/A'}</div>
                    </TableCell>
                    <TableCell className="px-2 py-2.5">
                      <span className="text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                        {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal('edit', tenant)}
                          title="Edit Branch"
                          className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal('delete', tenant)}
                          title="Delete Branch"
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Building className="h-12 w-12 text-gray-300 mb-3" strokeWidth={1.5} />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No branches found</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {tenants.length > 0
                          ? "No branches match your search."
                          : "No branches have been created yet."}
                      </p>
                      {tenants.length === 0 && (
                        <Button
                          onClick={() => openModal('create')}
                          className="mt-4"
                        >
                          Create your first branch
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Branches Cards - Mobile */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="relative w-8 h-8 mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-[#333333]"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-600 dark:border-t-green-500 border-r-green-600 dark:border-r-green-500 animate-spin" style={{ animationDuration: '0.6s' }}></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          ) : filteredTenants.length > 0 ? (
            filteredPaginatedTenants.map((tenant, index) => (
              <div key={tenant._id} className="bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-transparent shadow-sm p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">#{filteredStartIndex + index + 1}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{tenant.name}</h3>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 gap-3 mb-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Branch Admin</span>
                    <span className="text-gray-900 dark:text-white font-medium">{tenant.admin?.name || 'N/A'}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs block mt-0.5">{tenant.admin?.email || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Created On</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <Button
                    onClick={() => openModal('edit', tenant)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit size={14} className="mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => openModal('delete', tenant)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-[#222222] rounded-lg border border-gray-200 dark:border-transparent">
              <Building className="h-12 w-12 text-gray-300 mb-3" strokeWidth={1.5} />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">No branches found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                {tenants.length > 0
                  ? "No branches match your search."
                  : "No branches have been created yet."}
              </p>
              {tenants.length === 0 && (
                <Button
                  onClick={() => openModal('create')}
                  className="mt-4"
                >
                  Create your first branch
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredTenants.length > 0 && (
          <div className="flex items-center justify-between mt-6 px-6 py-4">
            <div className="text-base text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium">{filteredStartIndex + 1}</span> to <span className="font-medium">{Math.min(filteredEndIndex, filteredTenants.length)}</span> of <span className="font-medium">{filteredTenants.length}</span> branches
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-sm px-4"
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: filteredTotalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="text-sm w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(filteredTotalPages, prev + 1))}
                disabled={currentPage === filteredTotalPages}
                className="text-sm px-4"
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
                    placeholder="Enter branch name"
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
                        placeholder="Enter admin full name"
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
                        placeholder="admin@example.com"
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
                        placeholder="Enter temporary password"
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
                        className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
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
                    placeholder="Enter branch name"
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
                        placeholder="Enter admin full name"
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
                        placeholder="admin@example.com"
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
                        className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Only enter a new password if you want to change it.</p>
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
    </div>
  );
}