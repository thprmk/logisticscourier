// app/dashboard/page.tsx

"use client";

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useUser } from '../context/UserContext';
import { Package, Truck, CheckCircle2, AlertCircle, Plus, User as UserIcon, Calendar } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css"; // Styles for the date picker

// Interfaces for data
interface IShipment { status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed'; createdAt: string; }
interface DashboardStats { pending: number; outForDelivery: number; delivered: number; failed: number; }
interface IUser { _id: string; name: string; email: string; role: string; }

export default function BranchDashboardPage() {
  const { user } = useUser();
  const [allShipments, setAllShipments] = useState<IShipment[]>([]);
  const [staff, setStaff] = useState<IUser[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [shipmentsRes, staffRes] = await Promise.all([ fetch('/api/shipments'), fetch('/api/users?role=staff') ]);
        if (!shipmentsRes.ok) throw new Error('Failed to load shipment data.');
        if (!staffRes.ok) throw new Error('Failed to load staff data.');
        const shipmentsData = await shipmentsRes.json();
        const staffData = await staffRes.json();
        setAllShipments(shipmentsData);
        setStaff(staffData);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats: DashboardStats = useMemo(() => {
    const filteredShipments = allShipments.filter(shipment => {
        if (!startDate || !endDate) return true;
        const shipmentDate = new Date(shipment.createdAt);
        const start = new Date(startDate); start.setHours(0,0,0,0);
        const end = new Date(endDate); end.setHours(23,59,59,999);
        return shipmentDate >= start && shipmentDate <= end;
    });

    return filteredShipments.reduce((acc, s) => {
        if (s.status === 'Pending') acc.pending += 1;
        if (s.status === 'Out for Delivery') acc.outForDelivery += 1;
        if (s.status === 'Failed') acc.failed += 1;
        if (s.status === 'Delivered') acc.delivered += 1;
        return acc;
    }, { pending: 0, outForDelivery: 0, delivered: 0, failed: 0 });
  }, [allShipments, dateRange]);

  const handleAddStaff = async (event: FormEvent) => {
    event.preventDefault(); setIsSubmittingStaff(true);
    const toastId = toast.loading('Adding staff member...');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: staffName, email: staffEmail, password: staffPassword, role: 'staff' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add staff');
      toast.success('Staff added successfully!', { id: toastId });
      setStaff(prev => [...prev, data]);
      setStaffName(''); setStaffEmail(''); setStaffPassword('');
      setIsStaffModalOpen(false);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-8">
        {/* --- REFINED HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Welcome back, {user?.name || 'Manager'}.</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-2">
                <div className="relative">
                    <DatePicker
                        selectsRange={true}
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(update) => setDateRange(update)}
                        isClearable={true}
                        placeholderText="Pick a date range"
                        className="w-full md:w-64 h-10 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="absolute left-0 top-0 h-full pl-3 flex items-center pointer-events-none">
                        <Calendar size={18} className="text-gray-400" />
                    </div>
                </div>
            </div>
        </div>

        {/* --- PREMIUM STAT CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Pending Shipments" value={isLoading ? '...' : stats.pending} icon={Package} colorScheme="blue" />
            <StatCard title="Out for Delivery" value={isLoading ? '...' : stats.outForDelivery} icon={Truck} colorScheme="gray" />
            <StatCard title="Completed" value={isLoading ? '...' : stats.delivered} icon={CheckCircle2} colorScheme="purple" />
            <StatCard title="Failed Attempts" value={isLoading ? '...' : stats.failed} icon={AlertCircle} colorScheme="red" />
        </div>

        {/* --- MINIMAL STAFF MANAGEMENT SECTION --- */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Staff Members ({staff.length})</h2>
                <button onClick={() => setIsStaffModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm">
                    <Plus size={16} />
                    <span>Add Staff</span>
                </button>
            </div>
            <div className="flow-root">
              <ul className="divide-y divide-gray-200">
                {isLoading ? <li className="py-3 text-center text-gray-500">Loading...</li> : 
                 staff.length > 0 ? staff.map(member => (
                  <li key={member._id} className="py-3 flex items-center space-x-4">
                      <div className="flex-shrink-0">
                          <div className="h-9 w-9 flex items-center justify-center bg-gray-100 rounded-full"><UserIcon size={18} className="text-gray-500" /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                          <p className="text-sm text-gray-500 truncate">{member.email}</p>
                      </div>
                  </li>
                )) : <li className="py-3 text-center text-gray-500">No staff members have been added.</li>}
              </ul>
            </div>
        </div>

        {/* --- ADD STAFF MODAL --- */}
        {isStaffModalOpen && (
            <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
                    <form onSubmit={handleAddStaff}>
                        <div className="p-6">
                            <h2 className="text-xl font-semibold text-gray-900">Add New Staff Member</h2>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <input type="text" placeholder="Full Name" value={staffName} onChange={e => setStaffName(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md" />
                            <input type="email" placeholder="Email Address" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md" />
                            <input type="password" placeholder="Temporary Password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
                            <button type="button" onClick={() => setIsStaffModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-white border rounded-md">Cancel</button>
                            <button type="submit" disabled={isSubmittingStaff} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md disabled:bg-gray-500">{isSubmittingStaff ? 'Adding...' : 'Add Staff'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}

// --- NEW: Premium Stat Card Component inspired by your screenshot ---
interface StatCardProps { title: string; value: number | string; icon: React.ElementType; colorScheme: 'blue' | 'gray' | 'purple' | 'red'; }

function StatCard({ title, value, icon: Icon, colorScheme }: StatCardProps) {
    const colors = {
        blue:   { bg: 'bg-blue-50',   text: 'text-blue-600' },
        gray:   { bg: 'bg-gray-50',  text: 'text-gray-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
        red:    { bg: 'bg-red-50',    text: 'text-red-600' },
    };
    const selected = colors[colorScheme];

    return (
        <div className={`p-5 rounded-xl ${selected.bg}`}>
            <div className="flex justify-between items-center">
                <p className={`text-sm font-medium ${selected.text}`}>{title}</p>
                <Icon size={20} className={selected.text} />
            </div>
            <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
    );
}