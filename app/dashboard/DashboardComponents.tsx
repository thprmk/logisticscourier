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
    <div className={`${gradientMap[color]} rounded-2xl px-4 py-8 shadow-lg hover:shadow-xl transition-all relative overflow-hidden`}>
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full"></div>
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wide mb-4">{label}</p>
          <p className="text-4xl font-bold text-white">{value}</p>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-lg p-3">
          <Icon className="h-6 w-6 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// Action Card Component - Modern Style
export function ActionCard({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  isLoading,
  actionText,
  variant = 'default',
  onAction,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  items: IShipment[];
  emptyMessage: string;
  isLoading: boolean;
  actionText: string;
  variant?: 'default' | 'danger';
  onAction: (item: IShipment) => void;
}) {
  const bgColor = variant === 'danger' ? 'bg-red-100' : 'bg-blue-100';
  const borderColor = variant === 'danger' ? 'border-red-200/50' : 'border-gray-200/50';
  const iconColor = variant === 'danger' ? 'text-red-600' : 'text-blue-600';

  return (
    <div className={`bg-white/80 backdrop-blur rounded-2xl border ${borderColor} p-6 shadow-lg hover:shadow-xl transition-all`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`${bgColor} rounded-xl p-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <div key={item._id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200/50 hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.trackingId}</p>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.recipient.address}</p>
                {item.failureReason && <p className="text-xs text-red-600 mt-0.5">Reason: {item.failureReason}</p>}
              </div>
              <button
                onClick={() => onAction(item)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap ml-2"
              >
                {actionText}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Shipment Volume Chart Component - Modern SVG-based
export function ShipmentVolumeChart({
  data,
  isLoading,
}: {
  data: ChartDataPoint[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200/50 p-6 shadow-lg h-56 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200/50 p-6 shadow-lg h-56 flex items-center justify-center">
        <p className="text-xs text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.created, d.delivered)), 1);
  const chartHeight = 150;
  const chartWidth = Math.max(500, data.length * 50);
  const padding = 50;

  const createdPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - (d.created / maxValue) * (chartHeight - 30);
    return { x, y, data: d };
  });

  const deliveredPoints = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - (d.delivered / maxValue) * (chartHeight - 30);
    return { x, y, data: d };
  });

  const createdPath = createdPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const deliveredPath = deliveredPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200/50 p-3 shadow-lg hover:shadow-xl transition-all">
      <h3 className="text-xs font-semibold text-gray-900 mb-2">Shipment Volume</h3>
      <div className="overflow-x-auto">
        <svg width={chartWidth + 30} height={chartHeight + 40} className="mx-auto">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = chartHeight - (percent / 100) * (chartHeight - 30);
            return (
              <g key={`grid-${percent}`}>
                <line x1={padding - 5} y1={y} x2={chartWidth - padding + 5} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                <text x={padding - 10} y={y + 4} fontSize="10" textAnchor="end" fill="#9ca3af" className="font-light">
                  {Math.round((percent / 100) * maxValue)}
                </text>
              </g>
            );
          })}

          {/* Created line */}
          <path d={createdPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Delivered line */}
          <path d={deliveredPath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points - Created */}
          {createdPoints.map((p, i) => (
            (i % Math.max(1, Math.floor(data.length / 10))) === 0 && (
              <circle key={`created-${i}`} cx={p.x} cy={p.y} r="2" fill="#3b82f6" />
            )
          ))}

          {/* Data points - Delivered */}
          {deliveredPoints.map((p, i) => (
            (i % Math.max(1, Math.floor(data.length / 10))) === 0 && (
              <circle key={`delivered-${i}`} cx={p.x} cy={p.y} r="2" fill="#10b981" />
            )
          ))}

          {/* X-axis labels */}
          {data.map((d, i) => {
            const skip = Math.ceil(data.length / 8);
            if (i % skip !== 0) return null;
            const p = createdPoints[i];
            return (
              <text key={`label-${i}`} x={p.x} y={chartHeight + 20} fontSize="10" textAnchor="middle" fill="#6b7280" className="font-light">
                {d.date}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs justify-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Delivered</span>
        </div>
      </div>
    </div>
  );
}

// Monitoring Card Component - Modern Style
export function MonitoringCard({
  title,
  icon: Icon,
  items,
  emptyMessage,
  isLoading,
  type,
}: {
  title: string;
  icon: React.ElementType;
  items: IManifest[];
  emptyMessage: string;
  isLoading: boolean;
  type: 'incoming' | 'outgoing';
}) {
  const bgColor = type === 'incoming' ? 'bg-indigo-100' : 'bg-green-100';
  const iconColor = type === 'incoming' ? 'text-indigo-600' : 'text-green-600';
  const borderColor = 'border-gray-200/50';

  return (
    <div className={`bg-white/80 backdrop-blur rounded-2xl border ${borderColor} p-6 shadow-lg hover:shadow-xl transition-all`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`${bgColor} rounded-xl p-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {items.map((manifest) => (
            <div key={manifest._id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-200/50 hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">ID: {manifest._id.slice(-6)}</p>
                <p className="text-xs text-gray-600 mt-0.5 truncate">
                  {type === 'incoming' ? 'From' : 'To'}: {type === 'incoming' ? manifest.fromBranchId.name : manifest.toBranchId.name}
                </p>
              </div>
              <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap ml-2">Track</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


