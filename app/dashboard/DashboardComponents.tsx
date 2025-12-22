// app/dashboard/components/DashboardComponents.tsx

import { Clock, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ShipmentChartData {
  date: string;
  created: number;
  delivered: number;
  failed: number;
}

interface ShipmentOverviewChartProps {
  dateRange: 'week' | 'month' | 'last3months' | 'year';
  onDateRangeChange: (range: 'week' | 'month' | 'last3months' | 'year') => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface IShipment {
  _id: string;
  trackingId: string;
  status: string;
  createdAt: string;
  recipient: { name: string; address: string; phone: string };
  failureReason?: string;
}

interface IManifest {
  _id: string;
  fromBranchId: { name: string };
  toBranchId: { name: string };
  shipmentIds: string[];
  status: string;
  vehicleNumber?: string;
  dispatchedAt: string;
}

// Animated Number Component - Ultra smooth counting animation with spring physics
function AnimatedNumber({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useEffect(() => {
    let startTime: number | null = null;
    let animationFrameId: number;
    const startValue = displayValue;
    const difference = value - startValue;

    // If difference is 0, no animation needed
    if (difference === 0) return;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth step function - even smoother than cubic
      // Using smoothstep for ultra-fluid motion
      const smoothProgress = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      const currentValue = Math.floor(startValue + difference * smoothProgress);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return displayValue.toString();
}

export interface ChartDataPoint {
  date: string;
  created: number;
  delivered: number;
}

// KPI Card Component - Minimal Clean Design with Animated Numbers
export function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}) {
  const numValue = parseInt(value, 10);
  const colorStyles = {
    blue: { border: 'border-blue-200/60', text: 'text-blue-900', label: 'text-blue-700', bgIcon: 'bg-blue-500/15', icon: 'text-blue-600' },
    green: { border: 'border-green-200/60', text: 'text-green-900', label: 'text-green-700', bgIcon: 'bg-green-500/15', icon: 'text-green-600' },
    red: { border: 'border-red-200/60', text: 'text-red-900', label: 'text-red-700', bgIcon: 'bg-red-500/15', icon: 'text-red-600' },
    purple: { border: 'border-purple-200/60', text: 'text-purple-900', label: 'text-purple-700', bgIcon: 'bg-purple-500/15', icon: 'text-purple-600' },
    orange: { border: 'border-orange-200/60', text: 'text-orange-900', label: 'text-orange-700', bgIcon: 'bg-orange-500/15', icon: 'text-orange-600' },
  };

  const style = colorStyles[color];

  return (
    <div className={`bg-white rounded-xl border ${style.border} p-6 flex items-center justify-between hover:shadow-md transition-shadow`}>
      <div>
        <p className={`text-xs font-semibold ${style.label} uppercase tracking-widest`}>{label}</p>
        <p className={`text-4xl font-bold ${style.text} mt-3 font-mono`}>
          <AnimatedNumber value={numValue} duration={1200} />
        </p>
      </div>
      <div className={`${style.bgIcon} rounded-2xl p-4`}>
        <Icon className={`h-10 w-10 ${style.icon}`} strokeWidth={1.5} />
      </div>
    </div>
  );
}

// Modern Table Component
// Modern Table Component with scrollbar support
export function ModernTable({
  headers,
  data,
  renderRow,
  emptyMessage,
  isLoading,
}: {
  headers: string[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  emptyMessage: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-80">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200/50 bg-gray-50/50">
              {headers.map((header, i) => (
                <th key={i} className="px-8 py-5 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {headers.map((_, j) => (
                    <td key={j} className="px-8 py-5">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-8 py-10 text-center text-base text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Stat Card for Grid Layout - Minimal Clean Design
export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal';
  trend?: string;
}) {
  const colorStyles = {
    blue: { border: 'border-blue-200/60', text: 'text-blue-900', label: 'text-blue-700', bgIcon: 'bg-blue-500/15', icon: 'text-blue-600' },
    green: { border: 'border-green-200/60', text: 'text-green-900', label: 'text-green-700', bgIcon: 'bg-green-500/15', icon: 'text-green-600' },
    red: { border: 'border-red-200/60', text: 'text-red-900', label: 'text-red-700', bgIcon: 'bg-red-500/15', icon: 'text-red-600' },
    purple: { border: 'border-purple-200/60', text: 'text-purple-900', label: 'text-purple-700', bgIcon: 'bg-purple-500/15', icon: 'text-purple-600' },
    orange: { border: 'border-orange-200/60', text: 'text-orange-900', label: 'text-orange-700', bgIcon: 'bg-orange-500/15', icon: 'text-orange-600' },
    teal: { border: 'border-teal-200/60', text: 'text-teal-900', label: 'text-teal-700', bgIcon: 'bg-teal-500/15', icon: 'text-teal-600' },
  };

  const style = colorStyles[color];

  return (
    <div className={`bg-white rounded-xl border ${style.border} p-6 flex items-center justify-between hover:shadow-md transition-shadow`}>
      <div>
        <p className={`text-xs font-semibold ${style.label} uppercase tracking-widest`}>{label}</p>
        <p className={`text-4xl font-bold ${style.text} mt-3 font-mono`}>{value}</p>
        {trend && <p className="text-sm text-gray-500 mt-2 font-medium">{trend}</p>}
      </div>
      <div className={`${style.bgIcon} rounded-2xl p-4`}>
        <Icon className={`h-10 w-10 ${style.icon}`} strokeWidth={1.5} />
      </div>
    </div>
  );
}

// Shipment Overview Chart Component
export function ShipmentOverviewChart({
  dateRange,
  onDateRangeChange,
}: ShipmentOverviewChartProps) {
  const [chartData, setChartData] = useState<ShipmentChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    // Calculate based on dateRange preset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let start = today;
    let end = tomorrow;

    switch (dateRange) {
      case 'week':
        // Last 7 days (including today)
        start = new Date(today);
        start.setDate(today.getDate() - 6); // 7 days total (today + 6 days back)
        end = tomorrow;
        break;
      case 'month':
        // Current month (from first day of month to first day of next month)
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case 'last3months':
        // Last 3 months (from 3 months ago to today)
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        start.setDate(1); // Start from first day of that month
        end = tomorrow;
        break;
      case 'year':
        // Current year (from Jan 1 to Jan 1 of next year)
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear() + 1, 0, 1);
        break;
    }

    return {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0],
    };
  };

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange();

      console.log('Fetching chart data for range:', { from, to });

      const response = await fetch(`/api/shipments?from=${from}&to=${to}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch shipments: ${response.status}`);
      }

      const shipments: any[] = await response.json();
      console.log('Fetched shipments:', shipments.length);

      if (!Array.isArray(shipments)) {
        console.error('Invalid response format - expected array, got:', typeof shipments);
        setChartData([]);
        return;
      }

      if (shipments.length === 0) {
        console.log('No shipments found for date range');
        setChartData([]);
        return;
      }

      // Group shipments by date (simpler approach)
      const groupedByDate: { [key: string]: ShipmentChartData } = {};

      shipments.forEach((shipment) => {
        if (!shipment.createdAt) {
          console.warn('Shipment missing createdAt:', shipment._id);
          return;
        }

        try {
          const shipmentDate = new Date(shipment.createdAt);
          
          // Check if date is valid
          if (isNaN(shipmentDate.getTime())) {
            console.warn('Invalid date for shipment:', shipment._id, shipment.createdAt);
            return;
          }

          // Use ISO date string for grouping (YYYY-MM-DD)
          const dateKey = shipmentDate.toISOString().split('T')[0];
          
          // Format for display (e.g., "Jan 1")
          const dateDisplay = shipmentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          // Initialize if doesn't exist
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = { 
              date: dateDisplay, 
              created: 0, 
              delivered: 0, 
              failed: 0 
            };
          }

          // Count created
          groupedByDate[dateKey].created++;

          // Count by status
          if (shipment.status === 'Delivered') {
            groupedByDate[dateKey].delivered++;
          } else if (shipment.status === 'Failed') {
            groupedByDate[dateKey].failed++;
          }
        } catch (error) {
          console.error('Error processing shipment:', shipment._id, error);
        }
      });

      // Convert to array and sort by date key (which is sortable YYYY-MM-DD format)
      const data = Object.entries(groupedByDate)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([, data]) => data);

      console.log('Processed chart data:', data);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <div className="flex items-center justify-center h-80">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" style={{ animationDuration: '0.6s' }}></div>
            </div>
            <p className="text-sm text-gray-600 font-medium">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <div className="flex flex-col items-center justify-center h-80 gap-3">
          <div className="text-center">
            <p className="text-gray-500 font-medium text-base mb-1">No shipment data available for this period</p>
            <p className="text-gray-400 text-sm">
              Try selecting a different date range or create some shipments first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Shipment Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Track shipments created, delivered, and failed</p>
        </div>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-full sm:w-48 h-10 text-sm">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="last3months">Last 3 Months</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#createdGradient)"
              name="Created"
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
            />
            <Area
              type="monotone"
              dataKey="delivered"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#deliveredGradient)"
              name="Delivered"
              dot={{ fill: '#22c55e', r: 4 }}
              activeDot={{ r: 6, fill: '#15803d' }}
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#failedGradient)"
              name="Failed"
              dot={{ fill: '#ef4444', r: 4 }}
              activeDot={{ r: 6, fill: '#991b1b' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
