// app/dashboard/page.tsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { TrendingUp, Calendar, BarChart2, Target, Package as PackageIcon, CheckCircle, XCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '3months' | '1year'>('7days');

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/shipments', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch shipments');
        const data: IShipment[] = await response.json();
        setAllShipments(data);
        setError('');
      } catch (err: any) {
        setError(err.message || 'An error occurred');
        toast.error('Failed to load shipments data. Please refresh the page');
      } finally {
        setIsLoading(false);
      }
    };
    fetchShipments();
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
  }, [allShipments, startDate, endDate]);

  // Time-based statistics
  const timeBasedStats = useMemo(() => {
    const filtered = startDate && endDate 
      ? allShipments.filter(s => {
          const shipmentDate = new Date(s.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return shipmentDate >= start && shipmentDate <= end;
        })
      : allShipments;

    const delivered = filtered.filter(s => s.status === 'Delivered').length;
    const total = filtered.length;
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    return { delivered, total, successRate };
  }, [allShipments, startDate, endDate]);

  // Chart data for delivery trends - Simplified
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const data: Array<{ day: string; delivered: number; failed: number; total: number; date: Date }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Limit to maximum 30 days for better visualization
    const daysToShow = Math.min(daysDiff, 30);

    for (let i = 0; i <= daysToShow; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayShipments = allShipments.filter(s => {
        const shipmentDate = new Date(s.createdAt);
        return shipmentDate.toDateString() === date.toDateString();
      });

      const delivered = dayShipments.filter(s => s.status === 'Delivered').length;
      const failed = dayShipments.filter(s => s.status === 'Failed').length;
      const total = dayShipments.length;

      data.push({
        date,
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        delivered,
        failed,
        total,
      });
    }

    return data;
  }, [allShipments, startDate, endDate]);

  const maxChartValue = Math.max(...chartData.map(d => d.total), 1);

  if (error) return (
    <div className="flex h-96 items-center justify-center bg-white rounded-lg border border-gray-200">
      <div className="text-center max-w-md px-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
        <p className="text-sm text-gray-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Here's your shipment performance overview
          </p>
        </div>
        {user?.tenantName && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">{user.tenantName}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">        
        <MetricCard
          icon={PackageIcon}
          label="Total Shipments"
          value={isLoading ? "--" : stats.total.toString()}
          isLoading={isLoading}
          trend="+12%"
          color="pink"
        />
        <MetricCard
          icon={TrendingUp}
          label="Delivered"
          value={isLoading ? "--" : stats.delivered.toString()}
          isLoading={isLoading}
          trend="+8%"
          color="cyan"
        />
        <MetricCard
          icon={Calendar}
          label="In Progress"
          value={isLoading ? "--" : (stats.pending + stats.outForDelivery).toString()}
          isLoading={isLoading}
          color="purple"
        />
        <MetricCard
          icon={Target}
          label="Success Rate"
          value={isLoading ? "--" : `${timeBasedStats.successRate}%`}
          isLoading={isLoading}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
                  <BarChart2 className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Daily Delivery Performance</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Track delivery statistics by date</p>
                </div>
              </div>
            </div>
            
            {/* Date Range Picker Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Date Range:</span>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="start-date" className="text-sm text-gray-600 font-medium">From</label>
                  <input
                    type="date"
                    id="start-date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  />
                </div>
                <span className="text-gray-400">→</span>
                <div className="flex items-center gap-2">
                  <label htmlFor="end-date" className="text-sm text-gray-600 font-medium">To</label>
                  <input
                    type="date"
                    id="end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  />
                </div>
              </div>
              {startDate && endDate && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Chart Content */}
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Loading performance data...</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-dashed border-gray-200">
              <div className="text-center px-4">
                <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">No Date Range Selected</p>
                <p className="text-sm text-gray-500">Choose a date range above to view delivery performance</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {chartData.map((data, index) => {
                const successRate = data.total > 0 ? (data.delivered / data.total) * 100 : 0;
                const failureRate = data.total > 0 ? (data.failed / data.total) * 100 : 0;
                const pendingRate = 100 - successRate - failureRate;
                
                return (
                  <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-all group">
                    {/* Date Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{data.day}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total Shipments</p>
                          <p className="text-lg font-bold text-gray-900">{data.total}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Success Rate</p>
                          <p className="text-lg font-bold text-emerald-600">{successRate.toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Horizontal Stacked Bar */}
                    <div className="relative mb-3">
                      <div className="flex h-10 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                        {/* Delivered Section */}
                        {data.delivered > 0 && (
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-white font-bold text-sm hover:from-emerald-600 hover:to-emerald-500 transition-all relative group/bar cursor-pointer"
                            style={{ width: `${successRate}%` }}
                            title={`Delivered: ${data.delivered} (${successRate.toFixed(1)}%)`}
                          >
                            {successRate > 15 && (
                              <span className="flex items-center gap-1.5">
                                <CheckCircle className="h-4 w-4" />
                                <span>{data.delivered}</span>
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Failed Section */}
                        {data.failed > 0 && (
                          <div 
                            className="bg-gradient-to-r from-rose-500 to-rose-400 flex items-center justify-center text-white font-bold text-sm hover:from-rose-600 hover:to-rose-500 transition-all relative group/bar cursor-pointer"
                            style={{ width: `${failureRate}%` }}
                            title={`Failed: ${data.failed} (${failureRate.toFixed(1)}%)`}
                          >
                            {failureRate > 15 && (
                              <span className="flex items-center gap-1.5">
                                <XCircle className="h-4 w-4" />
                                <span>{data.failed}</span>
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Pending Section */}
                        {(data.total - data.delivered - data.failed) > 0 && (
                          <div 
                            className="bg-gradient-to-r from-amber-400 to-amber-300 flex items-center justify-center text-gray-800 font-bold text-sm hover:from-amber-500 hover:to-amber-400 transition-all relative group/bar cursor-pointer"
                            style={{ width: `${pendingRate}%` }}
                            title={`In Progress: ${data.total - data.delivered - data.failed} (${pendingRate.toFixed(1)}%)`}
                          >
                            {pendingRate > 15 && (
                              <span className="flex items-center gap-1.5">
                                <PackageIcon className="h-4 w-4" />
                                <span>{data.total - data.delivered - data.failed}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Details Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-xs text-emerald-700 font-medium">Delivered</p>
                          <p className="text-sm font-bold text-emerald-900">{data.delivered}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
                        <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-xs text-rose-700 font-medium">Failed</p>
                          <p className="text-sm font-bold text-rose-900">{data.failed}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-xs text-amber-700 font-medium">In Progress</p>
                          <p className="text-sm font-bold text-amber-900">{data.total - data.delivered - data.failed}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Breakdown - Right Column */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Status Overview</h3>
              <p className="text-xs text-gray-600 mt-0.5">Current shipment breakdown</p>
            </div>
          </div>

          {/* Status List */}
          <div className="space-y-4">
            <StatusItem
              label="Delivered"
              count={stats.delivered}
              percentage={stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}
              color="green"
            />
            <StatusItem
              label="Out for Delivery"
              count={stats.outForDelivery}
              percentage={stats.total > 0 ? Math.round((stats.outForDelivery / stats.total) * 100) : 0}
              color="blue"
            />
            <StatusItem
              label="Pending"
              count={stats.pending}
              percentage={stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}
              color="yellow"
            />
            <StatusItem
              label="Failed"
              count={stats.failed}
              percentage={stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}
              color="red"
            />
          </div>

          {/* Performance Insights */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <div className="text-blue-600 mt-0.5">💡</div>
              <div>
                <h4 className="text-sm font-bold text-blue-900 mb-1">Insight</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Success rate: <span className="font-bold">{timeBasedStats.successRate}%</span>
                  {timeBasedStats.successRate >= 90 
                    ? '. Outstanding performance!'
                    : '. Consider route optimization.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component - Enhanced with Gradient
interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isLoading?: boolean;
  trend?: string;
  color?: 'pink' | 'cyan' | 'purple' | 'orange';
}

function MetricCard({ icon: Icon, label, value, isLoading, trend, color = 'pink' }: MetricCardProps) {
  const colorClasses = {
    pink: {
      gradient: 'bg-gradient-to-br from-pink-500 to-pink-600',
      shadow: 'shadow-pink-200',
      iconBg: 'bg-pink-400/30',
    },
    cyan: {
      gradient: 'bg-gradient-to-br from-cyan-400 to-teal-500',
      shadow: 'shadow-cyan-200',
      iconBg: 'bg-cyan-300/30',
    },
    purple: {
      gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
      shadow: 'shadow-purple-200',
      iconBg: 'bg-purple-400/30',
    },
    orange: {
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
      shadow: 'shadow-orange-200',
      iconBg: 'bg-orange-400/30',
    },
  };

  return (
    <div className={`${colorClasses[color].gradient} rounded-2xl p-5 hover:shadow-xl ${colorClasses[color].shadow} transition-all duration-300 relative overflow-hidden`}>
      {/* Decorative circle */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-white/90">{label}</span>
          <div className={`p-2 rounded-lg ${colorClasses[color].iconBg}`}>
            <Icon className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
        </div>
        {isLoading ? (
          <div className="h-10 w-24 bg-white/20 rounded animate-pulse"></div>
        ) : (
          <div className="flex items-end justify-between">
            <p className="text-4xl font-bold text-white">{value}</p>
            {trend && (
              <span className="text-xs font-semibold text-white/90 flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Status Item Component
interface StatusItemProps {
  label: string;
  count: number;
  percentage: number;
  color: 'green' | 'blue' | 'yellow' | 'red';
}

function StatusItem({ label, count, percentage, color }: StatusItemProps) {
  const colorClasses = {
    green: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' },
    red: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClasses[color].bar}`}></div>
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900">{count}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${colorClasses[color].bg} ${colorClasses[color].text}`}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${colorClasses[color].bar} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
