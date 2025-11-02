// app/dashboard/page.tsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { Package as PackageIcon, Truck, CheckCircle2, XCircle, Calendar, TrendingUp, BarChart2, Activity, Clock, Building, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Interfaces for data
interface IShipment { 
  status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Failed'; 
  createdAt: string; 
}
interface DashboardStats { 
  pending: number; 
  outForDelivery: number; 
  delivered: number; 
  failed: number; 
  total: number;
}

export default function BranchDashboardPage() {
  const { user } = useUser();
  const [allShipments, setAllShipments] = useState<IShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const shipmentsRes = await fetch('/api/shipments');
        if (!shipmentsRes.ok) throw new Error('Failed to load shipment data.');
        const shipmentsData = await shipmentsRes.json();
        setAllShipments(shipmentsData);
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
        acc.total += 1;
        return acc;
    }, { pending: 0, outForDelivery: 0, delivered: 0, failed: 0, total: 0 });
  }, [allShipments, dateRange]);

  // Calculate time-based statistics
  const timeBasedStats = useMemo(() => {
    const filtered = startDate && endDate 
      ? allShipments.filter(s => {
          const shipmentDate = new Date(s.createdAt);
          return shipmentDate >= startDate && shipmentDate <= endDate;
        })
      : allShipments;

    const delivered = filtered.filter(s => s.status === 'Delivered').length;
    const total = filtered.length;
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    return { delivered, total, successRate };
  }, [allShipments, startDate, endDate]);

  // Chart data for daily delivery statistics
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const data: Array<{ day: string; delivered: number; pending: number; failed: number; date: Date }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayShipments = allShipments.filter(s => {
        const shipmentDate = new Date(s.createdAt);
        return shipmentDate.toDateString() === date.toDateString();
      });

      data.push({
        date,
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        delivered: dayShipments.filter(s => s.status === 'Delivered').length,
        pending: dayShipments.filter(s => s.status === 'Pending' || s.status === 'Assigned' || s.status === 'Out for Delivery').length,
        failed: dayShipments.filter(s => s.status === 'Failed').length,
      });
    }

    return data;
  }, [allShipments, startDate, endDate]);

  const maxChartValue = Math.max(...chartData.map(d => d.delivered + d.pending + d.failed), 1);

  if (error) return (
    <div className="flex h-96 items-center justify-center bg-white rounded-lg border border-gray-200">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto h-12 w-12 flex items-center justify-center bg-red-50 rounded-full mb-3">
          <XCircle className="h-6 w-6 text-red-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
        <p className="text-sm text-gray-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Here's your shipment performance overview. (Data fetching from live system.)
          </p>
        </div>
        
        {/* Date Range Picker - Minimalist Style */}
        <div className="flex items-center gap-3">
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update: [Date | null, Date | null]) => {
              setDateRange(update);
            }}
            isClearable={true}
            placeholderText="Select date range"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[240px]"
            dateFormat="MMM d, yyyy"
            maxDate={new Date()}
          />
        </div>
      </div>

      {/* Branch Info Section */}
      {user?.tenantName && (
        <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white rounded-2xl border border-blue-200 p-8 shadow-lg relative overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full -mr-32 -mt-32 opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-200 rounded-full -ml-24 -mb-24 opacity-20"></div>
          
          <div className="relative z-10 flex items-start gap-6">
            <div className="flex-shrink-0 p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl shadow-blue-500/30">
              <Building className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Branch Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold uppercase tracking-wide">Branch Name</p>
                  <p className="text-lg font-bold text-gray-900">{user.tenantName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold uppercase tracking-wide">Your Role</p>
                  <p className="text-lg font-bold text-gray-900">
                    {user.role === 'admin' ? 'Branch Manager' : 'Delivery Staff'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-gradient-to-br from-green-50 via-green-50/50 to-white rounded-2xl border border-green-200 p-8 shadow-lg relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-100 rounded-full -mr-32 -mt-32 opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-200 rounded-full -ml-24 -mb-24 opacity-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl shadow-xl shadow-green-500/30">
                <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Branch Performance</h3>
                <p className="text-base text-gray-600 mt-1">
                  {startDate && endDate 
                    ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                    : 'All time'}
                </p>
              </div>
            </div>
            <div className="text-right bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 text-green-700">
                <TrendingUp className="h-5 w-5" strokeWidth={2} />
                <span className="text-4xl font-bold">{timeBasedStats.successRate}%</span>
              </div>
              <p className="text-sm text-gray-600 font-semibold mt-1">Success Rate</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-green-200">
            <div className="text-center bg-white rounded-xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-gray-900">{timeBasedStats.total}</p>
              <p className="text-sm text-gray-600 mt-2 font-semibold">Total Shipments</p>
            </div>
            <div className="text-center bg-white rounded-xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-green-700">{timeBasedStats.delivered}</p>
              <p className="text-sm text-gray-600 mt-2 font-semibold">Delivered</p>
            </div>
            <div className="text-center bg-white rounded-xl p-4 shadow-sm">
              <p className="text-3xl font-bold text-gray-900">{timeBasedStats.total - timeBasedStats.delivered}</p>
              <p className="text-sm text-gray-600 mt-2 font-semibold">In Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Pending Shipments" 
          value={isLoading ? '--' : stats.pending} 
          icon={PackageIcon} 
          colorScheme="blue" 
          isLoading={isLoading}
        />
        <StatCard 
          title="Out for Delivery" 
          value={isLoading ? '--' : stats.outForDelivery} 
          icon={Truck} 
          colorScheme="indigo" 
          isLoading={isLoading}
        />
        <StatCard 
          title="Completed" 
          value={isLoading ? '--' : stats.delivered} 
          icon={CheckCircle2} 
          colorScheme="green" 
          isLoading={isLoading}
        />
        <StatCard 
          title="Failed Attempts" 
          value={isLoading ? '--' : stats.failed} 
          icon={XCircle} 
          colorScheme="red" 
          isLoading={isLoading}
        />
      </div>

      {/* Delivery Trends Chart - Premium Design */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
              <Activity className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Delivery Trends</h3>
              <p className="text-base text-gray-600 mt-1">
                {chartData.length > 0 ? `${chartData.length} days of shipment data` : 'Select a date range to view trends'}
              </p>
            </div>
          </div>
          
          {/* Chart Legend */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-gray-700">Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-gray-700">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-semibold text-gray-700">Failed</span>
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-600">Loading analytics...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">No Date Range Selected</h4>
              <p className="text-base text-gray-600">Please select a date range to view delivery trends</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stacked Bar Chart */}
            <div className="relative" style={{ height: `${Math.max(chartData.length * 50, 300)}px` }}>
              {chartData.map((data, index) => {
                const total = data.delivered + data.pending + data.failed;
                const deliveredPercent = total > 0 ? (data.delivered / total) * 100 : 0;
                const pendingPercent = total > 0 ? (data.pending / total) * 100 : 0;
                const failedPercent = total > 0 ? (data.failed / total) * 100 : 0;
                
                return (
                  <div key={index} className="mb-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-24 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">{data.day}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        {/* Stacked Progress Bar */}
                        <div className="flex-1 h-12 bg-gray-100 rounded-lg overflow-hidden flex shadow-inner">
                          {data.delivered > 0 && (
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center group relative hover:from-green-600 hover:to-green-700 transition-all duration-200"
                              style={{ width: `${deliveredPercent}%` }}
                            >
                              {deliveredPercent > 10 && (
                                <span className="text-white font-bold text-sm">{data.delivered}</span>
                              )}
                              <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                {data.delivered} Delivered
                              </div>
                            </div>
                          )}
                          {data.pending > 0 && (
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center group relative hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                              style={{ width: `${pendingPercent}%` }}
                            >
                              {pendingPercent > 10 && (
                                <span className="text-white font-bold text-sm">{data.pending}</span>
                              )}
                              <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                {data.pending} In Progress
                              </div>
                            </div>
                          )}
                          {data.failed > 0 && (
                            <div 
                              className="bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center group relative hover:from-red-600 hover:to-red-700 transition-all duration-200"
                              style={{ width: `${failedPercent}%` }}
                            >
                              {failedPercent > 10 && (
                                <span className="text-white font-bold text-sm">{data.failed}</span>
                              )}
                              <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                {data.failed} Failed
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="w-16 text-right">
                          <span className="text-sm font-bold text-gray-900">{total}</span>
                          <span className="text-xs text-gray-500 ml-1">total</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Stat Card Component
interface StatCardProps { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  colorScheme: 'blue' | 'indigo' | 'green' | 'red';
  isLoading?: boolean;
}

function StatCard({ title, value, icon: Icon, colorScheme, isLoading }: StatCardProps) {
  const colors = {
    blue:   { 
      bg: 'bg-blue-50', 
      text: 'text-blue-600', 
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600', 
      border: 'border-blue-200',
      shadow: 'shadow-blue-500/20'
    },
    indigo: { 
      bg: 'bg-indigo-50', 
      text: 'text-indigo-600', 
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', 
      border: 'border-indigo-200',
      shadow: 'shadow-indigo-500/20'
    },
    green:  { 
      bg: 'bg-green-50', 
      text: 'text-green-600', 
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600', 
      border: 'border-green-200',
      shadow: 'shadow-green-500/20'
    },
    red:    { 
      bg: 'bg-red-50', 
      text: 'text-red-600', 
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600', 
      border: 'border-red-200',
      shadow: 'shadow-red-500/20'
    },
  };
  const selected = colors[colorScheme];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-7 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${selected.bg} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className={`${selected.iconBg} p-4 rounded-2xl ${selected.shadow} shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
            <Icon size={32} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">{title}</p>
          {isLoading ? (
            <div className="h-12 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <p className="text-4xl font-bold text-gray-900 tracking-tight">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}