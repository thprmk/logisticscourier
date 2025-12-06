'use client';

import { useEffect, useState } from 'react';
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
import { Loader } from 'lucide-react';
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
  customStart?: string;
  customEnd?: string;
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

export default function ShipmentOverviewChart({
  dateRange,
  customStart,
  customEnd,
  onDateRangeChange,
}: ShipmentOverviewChartProps) {
  const [chartData, setChartData] = useState<ShipmentChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let start = today;
    let end = tomorrow;

    switch (dateRange) {
      case 'week':
        start = new Date(today);
        const dayOfWeek = today.getDay();
        start.setDate(today.getDate() - dayOfWeek); // Start of current week (Sunday)
        end = tomorrow;
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case 'last3months':
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        end = tomorrow;
        break;
      case 'year':
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

      // Fetch all shipments for the date range
      const response = await fetch(`/api/shipments?from=${from}&to=${to}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch shipments');

      const shipments: any[] = await response.json();

      // Group shipments by date
      const groupedByDate: { [key: string]: ShipmentChartData } = {};

      shipments.forEach((shipment) => {
        const date = new Date(shipment.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, created: 0, delivered: 0, failed: 0 };
        }

        groupedByDate[date].created++;

        if (shipment.status === 'Delivered') {
          groupedByDate[date].delivered++;
        } else if (shipment.status === 'Failed') {
          groupedByDate[date].failed++;
        }
      });

      // Convert to array and sort by date
      const data = Object.values(groupedByDate).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

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
  }, [dateRange, customStart, customEnd]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <div className="flex items-center justify-center h-80">
          <div className="flex flex-col items-center gap-3">
            <Loader className="h-8 w-8 text-blue-600 animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-gray-600 font-medium">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/60 p-6">
        <div className="flex items-center justify-center h-80">
          <p className="text-gray-500 font-medium">No shipment data available for this period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-6 hover:shadow-md transition-shadow">
      {/* Header with Date Dropdown */}
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

      {/* Chart and Stats Collage Layout */}
      <div className="w-full h-72">
        {/* Chart */}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
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
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
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
