// app/dashboard/page.tsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { TrendingUp, Calendar, BarChart2, Target, Package as PackageIcon } from 'lucide-react';
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
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '3months' | '1year'>('7days');

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/shipments');
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
  }, [allShipments, dateRange]);

  // Time-based statistics
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

  // Chart data for delivery trends
  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const data: Array<{ day: string; value: number; date: Date }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= Math.min(daysDiff, 30); i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayShipments = allShipments.filter(s => {
        const shipmentDate = new Date(s.createdAt);
        return shipmentDate.toDateString() === date.toDateString();
      });

      const delivered = dayShipments.filter(s => s.status === 'Delivered').length;
      const total = dayShipments.length;
      const profitLoss = delivered * 100 - (total - delivered) * 50; // Mock P&L calculation

      data.push({
        date,
        day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: profitLoss,
      });
    }

    return data;
  }, [allShipments, startDate, endDate]);

  const maxChartValue = Math.max(...chartData.map(d => Math.abs(d.value)), 1);

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
        />
        <MetricCard
          icon={TrendingUp}
          label="Delivered"
          value={isLoading ? "--" : stats.delivered.toString()}
          isLoading={isLoading}
          trend="+8%"
          color="green"
        />
        <MetricCard
          icon={Calendar}
          label="In Progress"
          value={isLoading ? "--" : (stats.pending + stats.outForDelivery).toString()}
          isLoading={isLoading}
          color="blue"
        />
        <MetricCard
          icon={Target}
          label="Success Rate"
          value={isLoading ? "--" : `${timeBasedStats.successRate}%`}
          isLoading={isLoading}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart2 className="h-5 w-5 text-blue-600" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delivery Performance</h3>
                <p className="text-xs text-gray-600 mt-0.5">Track shipment trends over time</p>
              </div>
            </div>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update: [Date | null, Date | null]) => setDateRange(update)}
              isClearable={true}
              placeholderText="Select range"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              dateFormat="MMM d"
            />
          </div>

          {/* Bar Chart */}
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Select a date range to view chart</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-1">
              {chartData.map((data, index) => {
                const height = (Math.abs(data.value) / maxChartValue) * 100;
                const isPositive = data.value >= 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div 
                      className={`w-full rounded-t transition-all ${
                        isPositive ? 'bg-black hover:bg-gray-800' : 'bg-red-500 hover:bg-red-600'
                      }`}
                      style={{ height: `${height}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs text-center pt-1">
                        {data.value > 0 ? '+' : ''}{data.value}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">{data.day}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart Labels */}
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">Oct 9</span>
            <span className="text-xs text-gray-500">Oct 16</span>
          </div>
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

// Metric Card Component - Enhanced
interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isLoading?: boolean;
  trend?: string;
  color?: 'green' | 'blue' | 'purple' | 'gray';
}

function MetricCard({ icon: Icon, label, value, isLoading, trend, color = 'gray' }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    gray: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 bg-gray-100 rounded animate-pulse"></div>
      ) : (
        <div className="flex items-end justify-between">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
      )}
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
