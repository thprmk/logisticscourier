// app/superadmin/dashboard/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Plus, Building, Edit, Trash2, Eye, EyeOff } from 'lucide-react';


// Define TypeScript interfaces
interface AdminInfo {
  name: string;
  email: string;
}

interface Tenant { _id: string; name: string; createdAt: string; admin?: AdminInfo; }

export default function SuperAdminDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  useEffect(() => { fetchTenants(); }, []);

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
        fetchTenants();
    } catch (error: any) {
        toast.error(error.message, { id: toastId });
    } finally { 
        setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
         <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Branches Dashboard</h1>
          <p className="text-gray-500 mt-1">Create, edit, and manage all branches on the platform.</p>
      </div>
        <button onClick={() => openModal('create')} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
          <Plus size={18} /> Add New Branch
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S/No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch Admin</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">Loading...</td></tr>
            ) : tenants.length > 0 ? (
              tenants.map((tenant, index) => (
                <tr key={tenant._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{tenant.name}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tenant.admin?.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{tenant.admin?.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                    {/* SIMPLIFIED ACTIONS: 'View' button is removed */}
                    <button onClick={() => openModal('edit', tenant)} className="text-gray-400 hover:text-indigo-600" title="Edit Branch"><Edit size={18}/></button>
                    <button onClick={() => openModal('delete', tenant)} className="text-gray-400 hover:text-red-600" title="Delete Branch"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">No branches have been created yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* --- MODALS --- */}
            {/* === FINAL REFINED Create Modal === */}
{/* === FINAL POLISHED Create Modal === */}
{modalType === 'create' && (
    <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
        <form onSubmit={handleCreateTenant} autoComplete="off">
          {/* Header */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Branch</h2>
            <p className="text-sm text-gray-500 mt-1">Fill in the details below to set up a new branch and its administrator.</p>
          </div>
          
          {/* Form Body */}
          <div className="px-6 pb-6 space-y-6">
            <fieldset>
                <legend className="text-base font-medium text-gray-900 mb-2">Branch Details</legend>
                <div className="grid grid-cols-1">
                    <div>
                        <label htmlFor="branchName" className="block text-sm font-medium text-gray-700">Branch Name</label>
                        <input type="text" id="branchName" value={branchName} onChange={(e) => setBranchName(e.target.value)} autoComplete="off" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend className="text-base font-medium text-gray-900 mb-2">Administrator Details</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div>
                        <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">Admin Full Name</label>
                        <input type="text" id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} autoComplete="off" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                     <div>
                        <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">Admin Email</label>
                        <input type="email" id="adminEmail" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="off" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div className="md:col-span-2">
    <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">Temporary Password</label>
    <div className="relative mt-1">
        <input 
            type={showPassword ? 'text' : 'password'} 
            id="adminPassword" 
            value={adminPassword} 
            onChange={(e) => setAdminPassword(e.target.value)} 
            autoComplete="new-password"
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm pr-10" 
            required 
        />
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
            aria-label="Toggle password visibility"
        >
            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
    </div>
</div>
                </div>
            </fieldset>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50  rounded-b-lg">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md shadow-sm hover:bg-gray-900 disabled:bg-gray-400 focus:outline-none">
              {isSubmitting ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
)}

{/* === FINAL REFINED Edit Modal === */}
{modalType === 'edit' && selectedTenant && (
    <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
            <form onSubmit={handleEditTenant} autoComplete="off">
                {/* Header */}
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Branch</h2>
                    <p className="text-sm text-gray-500 mt-1">Update details for <span className="font-medium text-gray-700">{selectedTenant.name}</span>.</p>
                </div>

                {/* Form Body */}
                <div className="px-6 pb-6 space-y-6">
                    <fieldset>
                        <legend className="text-base font-medium text-gray-900 mb-2">Branch Details</legend>
                        <div>
                            <label htmlFor="editBranchName" className="block text-sm font-medium text-gray-700">Branch Name</label>
                            <input type="text" id="editBranchName" value={branchName} onChange={(e) => setBranchName(e.target.value)} autoComplete="off" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend className="text-base font-medium text-gray-900 mb-2">Administrator Details</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                                <label htmlFor="editAdminName" className="block text-sm font-medium text-gray-700">Admin Full Name</label>
                                <input type="text" id="editAdminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} autoComplete="off" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
                            </div>
                            <div>
                                <label htmlFor="editAdminEmail" className="block text-sm font-medium text-gray-700">Admin Email</label>
                                <input type="email" id="editAdminEmail" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="off" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" required />
                            </div>
                         
                         <div className="md:col-span-2">
    <label htmlFor="editAdminPassword" className="block text-sm font-medium text-gray-700">Reset Password</label>
    <div className="relative mt-1">
        <input 
            type={showPassword ? 'text' : 'password'} 
            id="editAdminPassword" 
            value={adminPassword} 
            onChange={(e) => setAdminPassword(e.target.value)} 
            autoComplete="new-password"
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm pr-10" 
            placeholder="Leave blank to keep current password" 
        />
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
            aria-label="Toggle password visibility"
        >
            {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
    </div>
    <p className="mt-1 text-xs text-gray-400">Only enter a new password if you want to change it.</p>
</div>
                        </div>
                    </fieldset>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 border border-transparent rounded-md shadow-sm hover:bg-gray-900 disabled:bg-gray-400 focus:outline-none">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
        </div>
    </div>
)}



{/* === FINAL REFINED Delete Modal === */}
{/* === FINAL POLISHED Delete Modal === */}
{modalType === 'delete' && selectedTenant && (
    <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="p-6 flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="ml-4 text-left">
                  <h2 className="text-xl font-semibold text-gray-900">Delete Branch</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to permanently delete this branch?
                  </p>
              </div>
          </div>
          
          {/* Body */}
          <div className="px-6 pb-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-red-700">
                            You are about to delete the branch <strong className="font-semibold">{selectedTenant.name}</strong>. All of this branch's data, including users and shipments, will be permanently removed. <strong className="font-semibold">This action cannot be undone.</strong>
                        </p>
                    </div>
                </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50  rounded-b-lg">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none">
                  Cancel
              </button>
              <button onClick={handleDeleteTenant} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-400 focus:outline-none">
                  {isSubmitting ? 'Deleting...' : 'Delete Branch'}
              </button>
          </div>
      </div>
    </div>
)}
    </div>
  );
}