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
  TrendingUp,
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { KPICard, ModernTable, StatCard } from "./DashboardComponents";

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
      const manifestsResponse = await manifestsRes.json();
      const manifests: IManifest[] = manifestsResponse.data || manifestsResponse;

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
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-base sm:text-sm text-gray-600 mt-1 sm:mt-0.5">
                Welcome back, {user?.name || 'User'}
              </p>
            </div>

            {/* Date Range Picker */}
            <div className="relative inline-block w-full md:w-56">
              <Button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                variant="outline"
                className="w-full justify-between text-gray-700 h-12 sm:h-10 text-base sm:text-sm"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 sm:h-4 sm:w-4 text-gray-500" strokeWidth={1.5} />
                  <span className="font-medium">
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
                </span>
                <ChevronDown className={`h-5 w-5 sm:h-4 sm:w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </Button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-2 sm:p-1">
                    {[
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'last7', label: 'Last 7 Days' },
                      { id: 'month', label: 'This Month' },
                      { id: 'custom', label: 'Custom Range' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (option.id === 'custom') {
                            setShowCustom(true);
                          } else {
                            setDateRange(option.id as any);
                            setShowCustom(false);
                          }
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-3 sm:py-2 text-left text-base sm:text-sm rounded-md transition-colors flex items-center gap-2 ${
                          dateRange === option.id
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showCustom && dateRange === "custom" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-3 sm:gap-4 items-end animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-sm sm:text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 sm:mb-1.5">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 sm:mb-1.5">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-4 sm:px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard
            label="Total Shipments"
            value={kpis.totalCreated.toString()}
            icon={Package}
            color="blue"
          />
          <KPICard
            label="Delivered"
            value={kpis.totalDelivered.toString()}
            icon={CheckCircle2}
            color="green"
          />
          <KPICard
            label="Failed"
            value={kpis.totalFailed.toString()}
            icon={AlertCircle}
            color="red"
          />
          <KPICard
            label="Success Rate"
            value={`${successRate}%`}
            icon={CheckCircle2}
            color="orange"
          />
        </div>

        {/* Operational Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
          <StatCard
            label="Ready for Assignment"
            value={readyForAssignment.length}
            icon={Package}
            color="blue"
            trend="Action Required"
          />
          <StatCard
            label="Failed Deliveries"
            value={failedDeliveries.length}
            icon={AlertCircle}
            color="red"
            trend="Needs Attention"
          />
          <StatCard
            label="Incoming Manifests"
            value={incomingManifests.length}
            icon={Package}
            color="purple"
            trend="In Transit"
          />
          <StatCard
            label="Outgoing Manifests"
            value={outgoingManifests.length}
            icon={Send}
            color="teal"
            trend="In Transit"
          />
        </div>

        {/* Recent Shipments Table */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-lg font-bold text-gray-900">Recent Activity</h2>
          </div>

          <ModernTable
            headers={['Tracking ID', 'Recipient', 'Status', 'Date']}
            data={[...readyForAssignment, ...failedDeliveries].slice(0, 8)}
            isLoading={operationalLoading}
            emptyMessage="No recent shipments found"
            renderRow={(shipment, i) => (
              <tr key={shipment._id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 sm:px-8 py-4 sm:py-5">
                  <span className="text-base sm:text-base font-medium text-gray-900 font-mono group-hover:text-blue-600 transition-colors">
                    {shipment.trackingId}
                  </span>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-5">
                  <div className="flex flex-col">
                    <span className="text-base sm:text-base text-gray-900 font-medium">{shipment.recipient.name}</span>
                    <span className="text-sm text-gray-500 truncate max-w-[250px]">{shipment.recipient.address}</span>
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-5">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${shipment.status === "Failed"
                    ? "bg-red-100 text-red-700"
                    : shipment.status === "At Destination Branch"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}>
                    {shipment.status}
                  </span>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-5 text-sm text-gray-500 font-medium">
                  {new Date(shipment.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
              </tr>
            )}
          />
        </div>
      </div>
    </div>
  );
}


