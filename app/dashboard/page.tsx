"use client";

import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  Calendar,
  ChevronDown,
} from "lucide-react";

interface IShipment {
  _id: string;
  trackingId: string;
  status:
    | "Pending"
    | "Assigned"
    | "Out for Delivery"
    | "Delivered"
    | "Failed"
    | "At Destination Branch";
  createdAt: string;
  recipient: { name: string; address: string };
  failureReason?: string;
  assignedTo?: { name: string };
}

interface IManifest {
  _id: string;
  fromBranchId: { name: string };
  toBranchId: { name: string };
  shipmentIds: string[];
  status: "In Transit" | "Completed";
  vehicleNumber?: string;
  driverName?: string;
  dispatchedAt: string;
}

interface KPIData {
  totalCreated: number;
  totalDelivered: number;
  totalFailed: number;
}

export default function BranchDashboardPage() {
  const { user } = useUser();
  const [dateRange, setDateRange] = useState<
    "today" | "yesterday" | "last7" | "month" | "custom"
  >("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [kpis, setKpis] = useState<KPIData>({
    totalCreated: 0,
    totalDelivered: 0,
    totalFailed: 0,
  });
  const [kpisLoading, setKpisLoading] = useState(false);

  const [readyForAssignment, setReadyForAssignment] = useState<IShipment[]>([]);
  const [failedDeliveries, setFailedDeliveries] = useState<IShipment[]>([]);
  const [incomingManifests, setIncomingManifests] = useState<IManifest[]>([]);
  const [outgoingManifests, setOutgoingManifests] = useState<IManifest[]>([]);
  const [operationalLoading, setOperationalLoading] = useState(false);

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let start = today;
    let end = tomorrow;

    switch (dateRange) {
      case "yesterday":
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(today);
        break;
      case "last7":
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        end = tomorrow;
        break;
      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case "custom":
        if (customStart && customEnd) {
          start = new Date(customStart);
          end = new Date(customEnd);
          end.setDate(end.getDate() + 1);
        }
        break;
    }

    return {
      from: start.toISOString().split("T")[0],
      to: end.toISOString().split("T")[0],
    };
  };

  const fetchKPIs = async () => {
    try {
      setKpisLoading(true);
      const { from, to } = getDateRange();

      const response = await fetch(`/api/shipments?from=${from}&to=${to}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch data");

      const shipments: IShipment[] = await response.json();

      setKpis({
        totalCreated: shipments.length,
        totalDelivered: shipments.filter((s) => s.status === "Delivered")
          .length,
        totalFailed: shipments.filter((s) => s.status === "Failed").length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setKpisLoading(false);
    }
  };

  const fetchOperationalData = async () => {
    try {
      setOperationalLoading(true);

      const shipmentsRes = await fetch("/api/shipments", {
        credentials: "include",
      });
      const manifestsRes = await fetch("/api/manifests", {
        credentials: "include",
      });

      if (!shipmentsRes.ok || !manifestsRes.ok)
        throw new Error("Failed to fetch data");

      const shipments: IShipment[] = await shipmentsRes.json();
      const manifests: IManifest[] = await manifestsRes.json();

      setReadyForAssignment(
        shipments
          .filter((s) => s.status === "At Destination Branch")
          .slice(0, 8)
      );
      setFailedDeliveries(shipments.filter((s) => s.status === "Failed").slice(0, 8));
      setIncomingManifests(
        manifests.filter((m) => m.status === "In Transit").slice(0, 5)
      );
      setOutgoingManifests(
        manifests.filter((m) => m.status === "In Transit").slice(0, 5)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setOperationalLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchOperationalData();
    const interval = setInterval(fetchOperationalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const successRate =
    kpis.totalCreated > 0
      ? Math.round((kpis.totalDelivered / kpis.totalCreated) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Date Range Picker */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <div className="relative inline-block w-56">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 justify-between"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  {dateRange === "today"
                    ? "Today"
                    : dateRange === "yesterday"
                    ? "Yesterday"
                    : dateRange === "last7"
                    ? "Last 7 Days"
                    : dateRange === "month"
                    ? "This Month"
                    : "Custom Range"}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange("today");
                      setShowCustom(false);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-blue-50 first:rounded-t-lg flex items-center gap-3 transition-colors"
                  >
                    <input
                      type="radio"
                      checked={dateRange === "today"}
                      readOnly
                      className="h-4 w-4 pointer-events-none"
                    />
                    <span>Today</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange("yesterday");
                      setShowCustom(false);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                  >
                    <input
                      type="radio"
                      checked={dateRange === "yesterday"}
                      readOnly
                      className="h-4 w-4 pointer-events-none"
                    />
                    <span>Yesterday</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange("last7");
                      setShowCustom(false);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                  >
                    <input
                      type="radio"
                      checked={dateRange === "last7"}
                      readOnly
                      className="h-4 w-4 pointer-events-none"
                    />
                    <span>Last 7 Days</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateRange("month");
                      setShowCustom(false);
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                  >
                    <input
                      type="radio"
                      checked={dateRange === "month"}
                      readOnly
                      className="h-4 w-4 pointer-events-none"
                    />
                    <span>This Month</span>
                  </button>
                  <div className="border-t border-gray-200"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustom(true);
                      setDateRange("custom");
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-blue-50 last:rounded-b-lg flex items-center gap-3 transition-colors"
                  >
                    <input
                      type="radio"
                      checked={dateRange === "custom"}
                      readOnly
                      className="h-4 w-4 pointer-events-none"
                    />
                    <span>Custom Range</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {showCustom && dateRange === "custom" && (
            <div className="mt-4 flex gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setShowCustom(false);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
          <KPICard
            label="Total Shipments"
            value={kpis.totalCreated}
            icon={Package}
            isLoading={kpisLoading}
            color="pink"
          />
          <KPICard
            label="Delivered"
            value={kpis.totalDelivered}
            icon={CheckCircle2}
            isLoading={kpisLoading}
            color="cyan"
          />
          <KPICard
            label="In Progress"
            value={0}
            icon={AlertCircle}
            isLoading={kpisLoading}
            color="purple"
          />
          <KPICard
            label="Success Rate"
            value={`${successRate}%`}
            icon={CheckCircle2}
            isLoading={kpisLoading}
            color="orange"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Actions */}
          <div className="lg:col-span-2 space-y-5">
            {/* Removed duplicate sections */}
          </div>

          {/* Right Column - Monitoring */}
          <div className="space-y-5">
            {/* Removed duplicate sections */}
          </div>
        </div>

        {/* Recent Shipments + Stats Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
          {/* Left: Recent Shipments Table (2/3 width) */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Shipments</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {readyForAssignment.length === 0 && failedDeliveries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-600">No recent shipments</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tracking ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...readyForAssignment, ...failedDeliveries].slice(0, 5).map((shipment: IShipment) => (
                      <tr key={shipment._id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{shipment.trackingId}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{shipment.recipient.name}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            shipment.status === "Failed"
                              ? "bg-red-100 text-red-700"
                              : shipment.status === "At Destination Branch"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {shipment.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{new Date(shipment.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: Action Required + Live Monitoring Stats (1/3 width, compact) */}
          <div className="space-y-6">
            {/* Action Required Stats */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Action Required</h3>
              <div className="space-y-2">
                <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Ready for Assignment</p>
                    <p className="text-2xl font-bold text-blue-600">{readyForAssignment.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600 opacity-30" />
                </div>
                <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Failed Deliveries</p>
                    <p className="text-2xl font-bold text-red-600">{failedDeliveries.length}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600 opacity-30" />
                </div>
                <div className="bg-purple-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Incoming Manifests</p>
                    <p className="text-2xl font-bold text-purple-600">{incomingManifests.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600 opacity-30" />
                </div>
              </div>
            </div>

            {/* Live Monitoring Stats */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Live Monitoring</h3>
              <div className="space-y-2">
                <div className="bg-green-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Staff Out for Delivery</p>
                    <p className="text-2xl font-bold text-green-600">0</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600 opacity-30" />
                </div>
                <div className="bg-teal-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Manifests In Transit</p>
                    <p className="text-2xl font-bold text-teal-600">{outgoingManifests.length}</p>
                  </div>
                  <Send className="h-8 w-8 text-teal-600 opacity-30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon: Icon,
  isLoading,
  color,
}: {
  label: string;
  value: number | string;
  icon: any;
  isLoading: boolean;
  color: 'pink' | 'cyan' | 'purple' | 'orange';
}) {
  const colorMap = {
    pink: 'bg-gradient-to-br from-pink-500 to-pink-600',
    cyan: 'bg-gradient-to-br from-cyan-400 to-teal-500',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  };

  return (
    <div className={`${colorMap[color]} rounded-2xl px-6 py-5 shadow-lg hover:shadow-xl transition-all text-white relative overflow-hidden`}>
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-semibold text-white/90">{label}</p>
          <Icon className="h-5 w-5 text-white/80" />
        </div>
        {isLoading ? (
          <div className="h-10 bg-white/20 rounded animate-pulse"></div>
        ) : (
          <p className="text-4xl font-bold text-white">{value}</p>
        )}
      </div>
    </div>
  );
}

function ActionSection({
  title,
  icon: Icon,
  count,
  isLoading,
  items,
  emptyMessage,
  children,
}: {
  title: string;
  icon: any;
  count: number;
  isLoading: boolean;
  items: any[];
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-0">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <span className="text-xs text-gray-500 font-medium ml-auto">
          {count} item{count !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 text-center">
          <p className="text-xs text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function ActionItem({
  title,
  subtitle,
  tag,
  buttonText,
}: {
  title: string;
  subtitle: string;
  tag?: "danger";
  buttonText: string;
}) {
  const tagColor =
    tag === "danger"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-xs">{title}</p>
        {tag ? (
          <span className={`inline-block mt-1 px-1.5 py-0.5 ${tagColor} text-xs rounded font-medium`}>
            {subtitle}
          </span>
        ) : (
          <p className="text-xs text-gray-600 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      <button className="ml-3 px-2.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors whitespace-nowrap">
        {buttonText}
      </button>
    </div>
  );
}

function MonitoringSection({
  title,
  icon: Icon,
  count,
  isLoading,
  emptyMessage,
  children,
}: {
  title: string;
  icon: any;
  count: number;
  isLoading: boolean;
  emptyMessage: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-0">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>

      {isLoading ? (
        <div className="p-4 text-center">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : !children ? (
        <div className="p-4 text-center">
          <p className="text-xs text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}

function MonitoringItem({
  title,
  subtitle,
  tag,
}: {
  title: string;
  subtitle: string;
  tag: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-900 font-medium">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
      </div>
      <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium whitespace-nowrap ml-2">
        {tag}
      </span>
    </div>
  );
}
