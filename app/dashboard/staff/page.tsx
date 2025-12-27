// app/dashboard/staff/page.tsx

"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useUser } from '../../context/UserContext';
import { Plus, User as UserIcon, Edit, Trash2, Building, Loader, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

// Interface for user data
interface IUser { 
  _id: string; 
  name: string; 
  email: string; 
  role: 'admin' | 'staff';
  isManager?: boolean;
}

export default function StaffManagementPage() {
  const { user } = useUser();
  const [staff, setStaff] = useState<IUser[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'staff' | 'admin'>('staff');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  // Search, filter, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const staffRes = await fetch('/api/users', {
        credentials: 'include',
      });
      if (!staffRes.ok) throw new Error('Failed to load staff data.');
      const staffData = await staffRes.json();
      setStaff(staffData);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAddStaff = async (event: FormEvent) => {
    event.preventDefault(); 
    setIsSubmittingStaff(true);
    const toastId = toast.loading(isEditingStaff ? 'Updating staff member...' : 'Adding new staff member...');
    
    try {
      const method = isEditingStaff ? 'PATCH' : 'POST';
      const url = isEditingStaff ? `/api/users/${editingStaffId}` : '/api/users';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: staffName, 
          email: staffEmail, 
          ...(staffPassword ? { password: staffPassword } : {}),
          role: staffRole 
        }),
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to ${isEditingStaff ? 'update' : 'add'} staff`);
      
      toast.success(`Staff member ${staffName} ${isEditingStaff ? 'updated' : 'added'} successfully`, { id: toastId });
      
      if (isEditingStaff) {
        setStaff(prev => prev.map(member => 
          member._id === editingStaffId ? { ...data, role: staffRole } : member
        ));
      } else {
        setStaff(prev => [...prev, data]);
      }
      
      setStaffName(''); 
      setStaffEmail(''); 
      setStaffPassword(''); 
      setStaffRole('staff');
      setIsEditingStaff(false);
      setEditingStaffId('');
      setIsStaffModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEditingStaff ? 'update' : 'add'} staff member`, { id: toastId });
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleEditStaff = (staffMember: IUser) => {
    // Prevent Branch Manager from editing themselves
    if (staffMember._id === user?.id) {
      toast.error('You cannot edit your own account. Contact Super Admin.');
      return;
    }
    // SECURITY: Check if trying to edit a Branch Manager
    if (staffMember.isManager) {
      toast.error('Cannot edit a Branch Manager. Contact Super Admin.');
      return;
    }
    setStaffName(staffMember.name);
    setStaffEmail(staffMember.email);
    setStaffRole(staffMember.role as 'staff' | 'admin');
    setEditingStaffId(staffMember._id);
    setIsEditingStaff(true);
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    // Prevent Branch Manager from deleting themselves
    if (staffId === user?.id) {
      toast.error('You cannot delete your own account. Contact Super Admin.');
      return;
    }
    // SECURITY: Check if trying to delete a Branch Manager
    const staffToDeleteObj = staff.find(s => s._id === staffId);
    if (staffToDeleteObj?.isManager) {
      toast.error('Cannot delete a Branch Manager. Contact Super Admin.');
      return;
    }
    setStaffToDelete({ id: staffId, name: staffName });
    setShowDeleteModal(true);
  };
  
  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    
    const toastId = toast.loading(`Removing ${staffToDelete.name}...`);
    try {
      const response = await fetch(`/api/users/${staffToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to remove staff');
      
      toast.success(`${staffToDelete.name} removed successfully`, { id: toastId });
      setStaff(prev => prev.filter(member => member._id !== staffToDelete.id));
      setShowDeleteModal(false);
      setStaffToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove staff member', { id: toastId });
    }
  };

  // Filter and search logic
  const filteredStaff = staff.filter(member => {
    // Apply role filter
    if (roleFilter && member.role !== roleFilter) {
      return false;
    }
    // Apply search query
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      return (
        member.name.toLowerCase().includes(lowercasedQuery) ||
        member.email.toLowerCase().includes(lowercasedQuery)
      );
    }
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  const handleSelectStaff = (staffId: string) => {
    const newSelected = new Set(selectedStaffIds);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaffIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStaffIds.size === filteredStaff.length) {
      setSelectedStaffIds(new Set());
    } else {
      const allIds = new Set(filteredStaff.map(s => s._id));
      setSelectedStaffIds(allIds);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStaffIds.size === 0) {
      toast.error('Please select at least one staff member');
      return;
    }

    setIsSubmittingStaff(true);
    const toastId = toast.loading(`Deleting ${selectedStaffIds.size} staff members...`);

    try {
      const deletePromises = Array.from(selectedStaffIds).map(staffId =>
        fetch(`/api/users/${staffId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
      );

      const responses = await Promise.all(deletePromises);
      const allOk = responses.every(res => res.ok);

      if (!allOk) throw new Error('Some deletions failed');

      toast.success(`Successfully deleted ${selectedStaffIds.size} staff members`, { id: toastId });
      setSelectedStaffIds(new Set());
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete staff members', { id: toastId });
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Helper: Check if current user is a Branch Manager (can manage staff)
  const isBranchManager = user?.role === 'admin' && (user as any)?.isManager === true;
  
  // Helper: Check if current user is a Dispatcher (cannot manage staff)
  const isDispatcher = user?.role === 'admin' && (user as any)?.isManager === false;

  if (error) return (
    <div className="flex h-64 items-center justify-center bg-white dark:bg-[#222222] rounded-lg shadow-sm border border-gray-200 dark:border-[#333333]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6 text-red-600 dark:text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Error loading data</h3>
        <p className="mt-1 text-base text-gray-500 dark:text-[#A3A3A3]">{error}</p>
      </div>
    </div>
  );

  const getRoleBadge = (member: IUser) => {
    if (member.role === 'admin') {
      if (member.isManager) {
        return <Badge className="bg-[#9333EA] text-white">Branch Manager</Badge>;
      } else {
        return <Badge className="bg-[#06B6D4] text-white">Dispatcher</Badge>;
      }
    } else {
      return <Badge className="bg-[#10B981] text-white">Delivery Staff</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User & Role Management</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-white mt-1 sm:mt-2">Manage staff members and their roles within your branch.</p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
        </div>

        {/* Filters and Button */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Filter by Role */}
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="role-filter" className="text-xs block mb-1 font-medium dark:text-white">Filter by Role</Label>
              <Select value={roleFilter || 'all'} onValueChange={(val) => setRoleFilter(val === 'all' ? '' : val)}>
                <SelectTrigger id="role-filter" className="h-10 text-sm">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin (Dispatcher)</SelectItem>
                  <SelectItem value="staff">Delivery Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear and Add Buttons */}
            <div className="flex items-end gap-2">
              {(searchQuery || roleFilter) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('');
                  }}
                  className="h-10 text-xs"
                >
                  Clear
                </Button>
              )}
              
              {!isDispatcher && (
                <Button
                  onClick={() => {
                    setStaffName('');
                    setStaffEmail('');
                    setStaffPassword('');
                    setStaffRole('staff');
                    setIsEditingStaff(false);
                    setEditingStaffId('');
                    setIsStaffModalOpen(true);
                  }}
                  title="Add new staff member"
                  className="h-10 gap-2 whitespace-nowrap text-sm bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add New Staff</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedStaffIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-[#222222] border border-blue-200 dark:border-[#333333] rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedStaffIds.size} staff member{selectedStaffIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              className="gap-2 text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              <Trash2 size={16} />
              Delete Selected
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedStaffIds(new Set())}
            className="text-sm dark:text-white"
          >
            Clear
          </Button>
        </div>
      )}
        
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="text-center">
              <div className="relative w-8 h-8 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-[#333333]"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 dark:border-t-blue-400 border-r-blue-500 dark:border-r-blue-400 animate-spin" style={{ animationDuration: '0.6s' }}></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-[#A3A3A3]">Loading...</p>
            </div>
          </div>
        ) : filteredStaff.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block table-container border border-gray-200 dark:border-[#333333] rounded-lg bg-white dark:bg-[#222222]">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50/80 dark:bg-[#222222] border-b border-gray-200 dark:border-[#333333] h-14 hover:bg-gray-50/80 dark:hover:bg-[#222222]">
                    <TableHead className="w-16 text-sm font-semibold dark:text-white">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.size === filteredStaff.length && filteredStaff.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                        title="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-16 text-sm font-semibold dark:text-white">S/No</TableHead>
                    <TableHead className="text-sm font-semibold dark:text-white">User</TableHead>
                    <TableHead className="text-sm font-semibold dark:text-white">Email</TableHead>
                    <TableHead className="text-sm font-semibold dark:text-white">Role</TableHead>
                    {!isDispatcher && (
                      <TableHead className="text-right text-sm font-semibold dark:text-white">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStaff.map((member, index) => (
                    <TableRow key={member._id} className="h-16 border-b border-gray-100 dark:border-[#333333] hover:bg-gray-50/50 dark:hover:bg-[#1A3D2A] transition-colors">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.has(member._id)}
                          onChange={() => handleSelectStaff(member._id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm dark:text-[#E5E5E5]">{startIndex + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#333333]">
                            <UserIcon className="h-4 w-4 text-gray-500 dark:text-[#A3A3A3]" />
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-[#A3A3A3]">{member.email}</TableCell>
                      <TableCell className="text-sm">{getRoleBadge(member)}</TableCell>
                      {!isDispatcher && (
                        <TableCell className="text-right space-x-1">
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStaff(member)}
                              title={member.isManager ? 'Cannot edit Branch Managers' : 'Edit Staff Member'}
                              disabled={member.isManager}
                              className="hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStaff(member._id, member.name)}
                              title={member.isManager ? 'Cannot delete Branch Managers' : 'Remove Staff Member'}
                              disabled={member.isManager}
                              className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {paginatedStaff.map((member, index) => (
                <div key={member._id} className="bg-white dark:bg-[#222222] border border-gray-200 dark:border-[#333333] rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.has(member._id)}
                        onChange={() => handleSelectStaff(member._id)}
                        className="w-4 h-4 cursor-pointer mt-1 flex-shrink-0"
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#333333] flex-shrink-0">
                        <UserIcon className="h-5 w-5 text-gray-500 dark:text-[#A3A3A3]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{member.name}</p>
                        <p className="text-sm text-gray-500 dark:text-[#A3A3A3] truncate">{member.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-[#A3A3A3] font-medium">S/No:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{startIndex + index + 1}</span>
                    </div>
                    {getRoleBadge(member)}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {!isDispatcher && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditStaff(member)}
                          title={member.isManager ? 'Cannot edit Branch Managers' : 'Edit Staff Member'}
                          disabled={member.isManager}
                          className="h-9 gap-2 dark:text-white"
                        >
                          <Edit size={16} />
                          <span className="text-xs">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteStaff(member._id, member.name)}
                          title={member.isManager ? 'Cannot delete Branch Managers' : 'Remove Staff Member'}
                          disabled={member.isManager}
                          className="h-9 gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800/30"
                        >
                          <Trash2 size={16} />
                          <span className="text-xs">Remove</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-[#A3A3A3]" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No staff members</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#A3A3A3] mb-6">Get started by adding a new staff member.</p>
            <Button
              onClick={() => {
                setStaffName('');
                setStaffEmail('');
                setStaffPassword('');
                setStaffRole('staff');
                setIsEditingStaff(false);
                setEditingStaffId('');
                setIsStaffModalOpen(true);
              }}
              className="gap-2 text-sm h-10 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
            >
              <Plus size={16} />
              Add First Staff Member
            </Button>
          </div>
        )}
        
        {filteredStaff.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white dark:bg-[#222222] border border-gray-200 dark:border-[#333333] rounded-lg">
          <div className="text-sm text-gray-600 dark:text-white">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredStaff.length)}</span> of <span className="font-medium">{filteredStaff.length}</span> staff members
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="text-xs px-3 h-9 dark:text-white"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={`text-xs w-8 h-8 p-0 ${currentPage === page ? 'bg-[#1A9D4A] hover:bg-[#158A3F] text-white' : 'dark:text-white'}`}
                >
                  {page}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="text-xs px-3 h-9 dark:text-white"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-[#222222] dark:border-[#333333]">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {isEditingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </DialogTitle>
            <DialogDescription className="dark:text-[#A3A3A3]">
              {isEditingStaff 
                ? 'Update the details for this staff member.' 
                : 'Fill in the details to add a new staff member to your branch.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddStaff} autoComplete="off" className="space-y-4">
            <div>
              <Label htmlFor="staffName" className="text-sm font-medium dark:text-white">Full Name</Label>
              <Input
                id="staffName"
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                autoComplete="off"
                placeholder="Enter staff member's name"
                required
                className="mt-2 h-10 text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="staffEmail" className="text-sm font-medium dark:text-white">Email Address</Label>
              <Input
                id="staffEmail"
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                autoComplete="off"
                placeholder="Enter email address"
                required
                className="mt-2 h-10 text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="staffPassword" className="text-sm font-medium dark:text-white">{isEditingStaff ? 'New Password (Optional)' : 'Temporary Password'}</Label>
              <Input
                id="staffPassword"
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                autoComplete="new-password"
                placeholder={isEditingStaff ? 'Leave blank to keep current password' : 'Enter temporary password'}
                required={!isEditingStaff}
                className="mt-2 h-10 text-sm"
              />
              {isEditingStaff && <p className="mt-1 text-xs text-gray-500 dark:text-[#A3A3A3]">Only fill this to change the password</p>}
            </div>
                        
            <div>
              <Label htmlFor="staffRole" className="text-sm font-medium dark:text-white">Role</Label>
              <Select value={staffRole} onValueChange={(val) => setStaffRole(val as 'staff' | 'admin')}>
                <SelectTrigger id="staffRole" className="mt-2 h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Delivery Staff (Driver)</SelectItem>
                  <SelectItem value="admin">Dispatcher (Admin)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-gray-500 dark:text-[#A3A3A3] flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold flex-shrink-0 mt-0.5"></span>
                <span>
                  <strong>Delivery Staff:</strong> Drivers - uses mobile app, makes deliveries.<br/>
                  <strong>Dispatcher:</strong> Can manage shipments, manifests, and drivers.
                </span>
              </p>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStaffModalOpen(false)}
                disabled={isSubmittingStaff}
                className="h-10 text-sm px-4 dark:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingStaff}
                className="h-10 text-sm px-6 bg-[#1A9D4A] hover:bg-[#158A3F] text-white"
              >
                {isSubmittingStaff 
                  ? (isEditingStaff ? 'Updating...' : 'Adding...') 
                  : (isEditingStaff ? 'Update Staff' : 'Add Staff')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md dark:bg-[#222222] dark:border-[#333333]">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Remove Staff Member</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-[#A3A3A3]">
                Are you sure you want to remove <span className="font-semibold dark:text-white">{staffToDelete?.name}</span> from your branch?
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setStaffToDelete(null);
              }}
              className="h-10 text-sm px-4 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteStaff}
              className="h-10 text-sm px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              Remove Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}