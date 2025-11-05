// app/dashboard/staff/page.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useUser } from '../../context/UserContext';
import { Plus, User as UserIcon, Edit, Trash2, Building } from 'lucide-react';
import toast from 'react-hot-toast';

// Interface for user data
interface IUser { 
  _id: string; 
  name: string; 
  email: string; 
  role: 'admin' | 'staff';
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

  useEffect(() => {
    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const staffRes = await fetch('/api/users', {
          credentials: 'include',
        });
        if (!staffRes.ok) throw new Error('Failed to load staff data.');
        const staffData = await staffRes.json();
        // Filter out admin users - only show delivery staff
        const deliveryStaff = staffData.filter((member: IUser) => member.role === 'staff');
        setStaff(deliveryStaff);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, []);

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
          ...(isEditingStaff ? {} : { password: staffPassword }),
          role: staffRole 
        }),
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
    setStaffName(staffMember.name);
    setStaffEmail(staffMember.email);
    setStaffRole(staffMember.role as 'staff' | 'admin');
    setEditingStaffId(staffMember._id);
    setIsEditingStaff(true);
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
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

  if (error) return (
    <div className="flex h-64 items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 text-red-500 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">Error loading data</h3>
        <p className="mt-1 text-base text-gray-500">{error}</p>
      </div>
    </div>
  );

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Admin</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Delivery Staff</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User & Role Management</h1>
        <p className="text-gray-600 mt-2">Manage staff members and their roles within your branch.</p>
      </div>

      {/* Staff Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Staff Members</h2>
              <p className="text-gray-600 mt-1">Manage your team members and their access levels</p>
            </div>
            <button 
              onClick={() => {
                setStaffName('');
                setStaffEmail('');
                setStaffPassword('');
                setStaffRole('staff');
                setIsEditingStaff(false);
                setEditingStaffId('');
                setIsStaffModalOpen(true);
              }} 
              className="flex items-center gap-2 h-12 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-gray-600">Loading staff members...</p>
            </div>
          </div>
        ) : staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(member.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => handleEditStaff(member)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Staff Member"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(member._id, member.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove Staff Member"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No staff members</h3>
            <p className="mt-1 text-gray-500">Get started by adding a new staff member.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
            <form onSubmit={handleAddStaff}>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {isEditingStaff 
                    ? 'Update the details for this staff member.' 
                    : 'Fill in the details to add a new staff member to your branch.'}
                </p>
              </div>
              
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label htmlFor="staffName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="staffName"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="staffEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="staffEmail"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                {!isEditingStaff && (
                  <div>
                    <label htmlFor="staffPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Temporary Password
                    </label>
                    <input
                      type="password"
                      id="staffPassword"
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="staffRole" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="staffRole"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as 'staff' | 'admin')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                    disabled
                  >
                    <option value="staff">Delivery Staff</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">New staff members are created as delivery staff by default.</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none disabled:bg-blue-400"
                >
                  {isSubmittingStaff 
                    ? (isEditingStaff ? 'Updating...' : 'Adding...') 
                    : (isEditingStaff ? 'Update Staff' : 'Add Staff')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && staffToDelete && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Remove Staff Member</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to remove <span className="font-semibold">{staffToDelete.name}</span> from your branch?
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setStaffToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStaff}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
              >
                Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}