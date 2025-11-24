// app/dashboard/components/DashboardComponents.tsx

import { Clock } from 'lucide-react';

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

export interface ChartDataPoint {
  date: string;
  created: number;
  delivered: number;
}

// KPI Card Component - Modern Gradient Style
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
  const gradientMap: Record<string, string> = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    green: 'bg-gradient-to-br from-green-500 to-green-600',
    red: 'bg-gradient-to-br from-red-500 to-red-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  };

  return (
    <div className={`${gradientMap[color]} rounded-2xl px-6 py-10 shadow-lg hover:shadow-xl transition-all relative overflow-hidden`}>
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full"></div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-white/90 text-sm font-bold uppercase tracking-wide mb-4">{label}</p>
          <p className="text-5xl font-bold text-white">{value}</p>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-xl p-4">
          <Icon className="h-8 w-8 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// Modern Table Component
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
      <div className="overflow-x-auto">
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

// Stat Card for Grid Layout
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
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'text-teal-600' },
  };

  const style = colorStyles[color];

  return (
    <div className={`${style.bg} rounded-xl p-6 flex items-center justify-between transition-transform hover:scale-[1.02]`}>
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2">{label}</p>
        <p className={`text-3xl font-bold ${style.text}`}>{value}</p>
        {trend && <p className="text-sm text-gray-500 mt-2 font-medium">{trend}</p>}
      </div>
      <div className="bg-white/60 p-3 rounded-xl">
        <Icon className={`h-8 w-8 ${style.icon}`} strokeWidth={2} />
      </div>
    </div>
  );
}
