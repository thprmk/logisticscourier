// app/dashboard/components/DashboardComponents.tsx

import { Clock, Loader, BarChart3 } from 'lucide-react';
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
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-white dark:bg-[#222222] p-4 rounded-xl shadow-xl border-2 border-gray-200 dark:border-transparent">
        <p className="text-sm font-bold text-gray-900 dark:text-[#E5E5E5] mb-3 pb-2 border-b border-gray-200 dark:border-[#333333]">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 min-w-[140px]">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-[#A3A3A3]">{entry.name}:</span>
              </div>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                {entry.value || 0}
              </span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-[#333333]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 dark:text-[#E5E5E5]">Total:</span>
              <span className="text-sm font-extrabold text-gray-900 dark:text-[#E5E5E5]">{total}</span>
            </div>
          </div>
        </div>
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

// KPI Card Component - Modern Enhanced Design with Animated Numbers
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
  // Handle percentage values (e.g., "33%")
  const isPercentage = value.includes('%');
  const numValue = isPercentage ? parseInt(value.replace('%', ''), 10) : parseInt(value, 10);

  const colorStyles = {
    blue: {
      text: 'text-blue-700 dark:text-blue-400',
      label: 'text-blue-600 dark:text-blue-400',
      bgIcon: 'bg-blue-100 dark:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-400',
      shadow: 'shadow-md'
    },
    green: {
      text: 'text-green-700 dark:text-green-400',
      label: 'text-green-600 dark:text-green-400',
      bgIcon: 'bg-green-100 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-400',
      shadow: 'shadow-md'
    },
    red: {
      text: 'text-red-700 dark:text-red-400',
      label: 'text-red-600 dark:text-red-400',
      bgIcon: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400',
      shadow: 'shadow-md'
    },
    purple: {
      text: 'text-purple-700 dark:text-purple-400',
      label: 'text-purple-600 dark:text-purple-400',
      bgIcon: 'bg-purple-100 dark:bg-purple-900/30',
      icon: 'text-purple-600 dark:text-purple-400',
      shadow: 'shadow-md'
    },
    orange: {
      text: 'text-orange-700 dark:text-orange-400',
      label: 'text-orange-600 dark:text-orange-400',
      bgIcon: 'bg-orange-100 dark:bg-orange-900/30',
      icon: 'text-orange-600 dark:text-orange-400',
      shadow: 'shadow-md'
    },
  };

  const style = colorStyles[color];

  return (
    <div className={`bg-white dark:bg-[#222222] rounded-2xl border-2 border-gray-200 dark:border-transparent p-5 sm:p-6 flex items-center justify-between hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 ${style.shadow}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-bold ${style.label} uppercase tracking-wide mb-2 sm:mb-3`}>{label}</p>
        <p className={`text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight ${style.text}`}>
          {isPercentage ? (
            <>
              <AnimatedNumber value={numValue} duration={1200} />%
            </>
          ) : (
            <AnimatedNumber value={numValue} duration={1200} />
          )}
        </p>
      </div>
      <div className={`${style.bgIcon} dark:bg-transparent rounded-xl sm:rounded-2xl p-3 sm:p-4 flex-shrink-0 ml-3 sm:ml-4 border border-transparent`}>
        <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${style.icon} dark:stroke-2`} strokeWidth={2.5} />
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
    <div className="bg-white/80 dark:bg-[#222222]/80 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg dark:shadow-gray-900/20 overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-80">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-[#222222]/50">
              {headers.map((header, i) => (
                <th key={i} className="px-8 py-5 text-left text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {headers.map((_, j) => (
                    <td key={j} className="px-8 py-5">
                      <div className="h-5 bg-gray-200 dark:bg-[#222222] rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-8 py-10 text-center text-base text-gray-500 dark:text-gray-400">
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

// Stat Card for Grid Layout - Modern Enhanced Design
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
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'teal' | 'cyan';
  trend?: string;
}) {
  const colorStyles = {
    blue: {
      text: 'text-blue-700 dark:text-blue-400',
      label: 'text-blue-600 dark:text-blue-400',
      bgIcon: 'bg-blue-100 dark:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-400',
      shadow: 'shadow-md'
    },
    green: {
      text: 'text-green-700 dark:text-green-400',
      label: 'text-green-600 dark:text-green-400',
      bgIcon: 'bg-green-100 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-400',
      shadow: 'shadow-md'
    },
    red: {
      text: 'text-red-700 dark:text-red-400',
      label: 'text-red-600 dark:text-red-400',
      bgIcon: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400',
      shadow: 'shadow-md'
    },
    purple: {
      text: 'text-purple-700 dark:text-purple-400',
      label: 'text-purple-600 dark:text-purple-400',
      bgIcon: 'bg-purple-100 dark:bg-purple-900/30',
      icon: 'text-purple-600 dark:text-purple-400',
      shadow: 'shadow-md'
    },
    orange: {
      text: 'text-orange-700 dark:text-orange-400',
      label: 'text-orange-600 dark:text-orange-400',
      bgIcon: 'bg-orange-100 dark:bg-orange-900/30',
      icon: 'text-orange-600 dark:text-orange-400',
      shadow: 'shadow-md'
    },
    teal: {
      text: 'text-teal-700 dark:text-teal-400',
      label: 'text-teal-600 dark:text-teal-400',
      bgIcon: 'bg-teal-100 dark:bg-teal-900/30',
      icon: 'text-teal-600 dark:text-teal-400',
      shadow: 'shadow-md'
    },
    cyan: {
      text: 'text-cyan-700 dark:text-cyan-400',
      label: 'text-cyan-600 dark:text-cyan-400',
      bgIcon: 'bg-cyan-100 dark:bg-cyan-900/30',
      icon: 'text-cyan-600 dark:text-cyan-400',
      shadow: 'shadow-md'
    },
  };

  const style = colorStyles[color];

  return (
    <div className={`bg-white dark:bg-[#222222] rounded-xl border-2 border-gray-200 dark:border-transparent p-4 sm:p-5 flex items-center justify-between hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 ${style.shadow}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold dark:text-gray-100 uppercase tracking-wide mb-1.5 sm:mb-2`}>{label}</p>
        <p className={`text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight ${style.text}`}>{value}</p>
        {trend && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2 font-semibold">{trend}</p>}
      </div>
      <div className={`${style.bgIcon} dark:bg-transparent rounded-lg sm:rounded-xl p-2.5 sm:p-3 flex-shrink-0 ml-2 sm:ml-3 border border-transparent`}>
        <Icon className={`h-6 w-6 sm:h-7 sm:w-7 dark:stroke-2 ${style.icon}`} strokeWidth={2.5} />
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
      <div className="bg-white dark:bg-[#222222] rounded-2xl border-2 border-gray-200 dark:border-transparent p-5 sm:p-6">
        <div className="flex items-center justify-center h-80 sm:h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 border-r-blue-600 dark:border-r-blue-400 animate-spin" style={{ animationDuration: '0.6s' }}></div>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-[#222222] rounded-2xl border-2 border-gray-200 dark:border-transparent p-5 sm:p-6">
        <div className="flex flex-col items-center justify-center h-80 sm:h-96 gap-4">
          <div className="bg-gray-50 dark:bg-[#222222] rounded-full p-4">
            <BarChart3 className="h-10 w-10 text-gray-400 dark:text-gray-500" strokeWidth={2} />
          </div>
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300 font-bold text-lg mb-2">No shipment data available</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              Try selecting a different date range or create some shipments first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#222222] rounded-2xl border-2 border-gray-200 dark:border-transparent p-5 sm:p-6 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 shadow-sm">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-2.5">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">Shipment Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Track shipments created, delivered, and failed</p>
          </div>
        </div>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-full sm:w-48 h-11 text-sm font-semibold border-2 border-gray-200 dark:border-transparent rounded-lg bg-white dark:bg-[#222222] text-gray-900 dark:text-gray-100">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#222222] border-gray-200 dark:border-transparent">
            <SelectItem value="week" className="text-gray-900 dark:text-gray-100">This Week</SelectItem>
            <SelectItem value="month" className="text-gray-900 dark:text-gray-100">This Month</SelectItem>
            <SelectItem value="last3months" className="text-gray-900 dark:text-gray-100">Last 3 Months</SelectItem>
            <SelectItem value="year" className="text-gray-900 dark:text-gray-100">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full h-80 sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-[#333333]" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
              tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
              className="dark:[&>text]:fill-[#A3A3A3] dark:[&>line]:stroke-[#333333]"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
              tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
              axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
              className="dark:[&>text]:fill-[#A3A3A3] dark:[&>line]:stroke-[#333333]"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '24px', paddingBottom: '8px' }}
              iconType="circle"
              iconSize={10}
              formatter={(value) => <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="created"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#createdGradient)"
              name="Created"
              dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#1d4ed8', strokeWidth: 3, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="delivered"
              stroke="#22c55e"
              strokeWidth={3}
              fill="url(#deliveredGradient)"
              name="Delivered"
              dot={{ fill: '#22c55e', r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#15803d', strokeWidth: 3, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#failedGradient)"
              name="Failed"
              dot={{ fill: '#ef4444', r: 5, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 8, fill: '#991b1b', strokeWidth: 3, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
