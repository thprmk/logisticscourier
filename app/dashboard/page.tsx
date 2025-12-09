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
import { KPICard, ModernTable, StatCard, ShipmentOverviewChart } from "./DashboardComponents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

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
    "today" | "yesterday" | "last7" | "month" | "custom" | "all"
  >("today");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [showCustom, setShowCustom] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chartDateRange, setChartDateRange] = useState<'week' | 'month' | 'last3months' | 'year'>('week');

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
    // Fetch KPIs with today's date only on initial mount
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const from = today.toISOString().split('T')[0];
    const to = tomorrow.toISOString().split('T')[0];
    
    const fetchTodayKPIs = async () => {
      try {
        setKpisLoading(true);
        const response = await fetch(`/api/shipments?from=${from}&to=${to}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        // Handle both array response and {data: [...]} response
        const shipments: IShipment[] = Array.isArray(data) ? data : data.data || [];
        console.log(`Initial load - Fetched ${shipments.length} shipments for today`);
        setKpis({
          totalCreated: shipments.length,
          totalDelivered: shipments.filter((s) => s.status === 'Delivered').length,
          totalFailed: shipments.filter((s) => s.status === 'Failed').length,
        });
      } catch (err) {
        console.error('Error in initial KPI fetch:', err);
      } finally {
        setKpisLoading(false);
      }
    };
    
    fetchTodayKPIs();
  }, []);

  useEffect(() => {
    fetchOperationalData();
    const interval = setInterval(fetchOperationalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const successRate =
    kpis.totalCreated > 0
      ? Math.round((kpis.totalDelivered / kpis.totalCreated) * 100)
      : 0;

  const handleApplyFilter = () => {
    if (customStart && customEnd) {
      const from = customStart.toISOString().split('T')[0];
      const to = new Date(customEnd);
      to.setDate(to.getDate() + 1);
      const toStr = to.toISOString().split('T')[0];
      
      const fetchCustomKPIs = async () => {
        try {
          setKpisLoading(true);
          console.log(`Applying filter from ${from} to ${toStr}`);
          const response = await fetch(`/api/shipments?from=${from}&to=${toStr}`, {
            credentials: 'include',
          });
          console.log(`Response status: ${response.status}`);
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${errorText}`);
            throw new Error(`Failed to fetch data: ${response.status}`);
          }
          const data = await response.json();
          console.log('Raw API response:', data);
          // Handle both array response and {data: [...]} response
          const shipments: IShipment[] = Array.isArray(data) ? data : data.data || [];
          console.log(`Successfully fetched ${shipments.length} shipments from ${from} to ${toStr}`);
          setKpis({
            totalCreated: shipments.length,
            totalDelivered: shipments.filter((s) => s.status === 'Delivered').length,
            totalFailed: shipments.filter((s) => s.status === 'Failed').length,
          });
          setDropdownOpen(false);
        } catch (err) {
          console.error('Error fetching custom KPIs:', err);
        } finally {
          setKpisLoading(false);
        }
      };
      
      fetchCustomKPIs();
    } else {
      console.log('Custom start or end date not selected');
    }
  };

  const formatDateDisplay = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      return `${customStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${customEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : dateRange === 'last7' ? 'Last 7 Days' : 'This Month';
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="border-b border-gray-200/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-row items-center justify-between gap-6">
            {/* Left: Branch Name and Welcome */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{user?.tenantName || 'Your Branch'}</h1>
              <p className="text-sm text-gray-600 font-medium">Welcome back, <span className="text-gray-900 font-semibold">{user?.name || 'Admin'}</span></p>
            </div>

            {/* Right: Date Range Picker with Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex-1 min-w-[180px]">
                <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full h-9 justify-start text-sm font-normal text-gray-600 hover:bg-gray-100/50 border border-gray-200/50"
                    >
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {customStart && customEnd
                        ? `${customStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${customEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`
                        : 'Pick a date range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex gap-0">
                      <div className="p-3">
                        <CalendarComponent
                          mode="single"
                          selected={customStart}
                          onSelect={(date) => {
                            setCustomStart(date);
                            setDateRange("custom");
                          }}
                          disabled={(date) =>
                            customEnd ? date > customEnd : false
                          }
                          onDayClick={(day) => {
                            // Double-click handling: if same date clicked twice, apply filter
                            if (customStart && customStart.toDateString() === day.toDateString() && !customEnd) {
                              setCustomEnd(day);
                              setDateRange("custom");
                              setDropdownOpen(false);
                              // Auto-apply filter when double-clicked
                              setTimeout(() => handleApplyFilter(), 0);
                            }
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <CalendarComponent
                          mode="single"
                          selected={customEnd}
                          onSelect={(date) => {
                            setCustomEnd(date);
                            setDateRange("custom");
                          }}
                          disabled={(date) =>
                            customStart ? date < customStart : false
                          }
                          numberOfMonths={1}
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Apply Filter Button */}
              <Button
                onClick={handleApplyFilter}
                disabled={!customStart || !customEnd}
                className="h-9 px-4 text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                Apply Filter
              </Button>

              {/* All Time Button */}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDateRange('all');
                  setCustomStart(undefined);
                  setCustomEnd(undefined);
                  setDropdownOpen(false);
                  // Fetch all-time data (no date filter)
                  fetch(`/api/shipments`, { credentials: 'include' })
                    .then(res => {
                      if (!res.ok) throw new Error(`Failed: ${res.status}`);
                      return res.json();
                    })
                    .then((shipments: any[]) => {
                      console.log(`Fetched ${shipments.length} shipments - All Time`);
                      setKpis({
                        totalCreated: shipments.length,
                        totalDelivered: shipments.filter((s: any) => s.status === 'Delivered').length,
                        totalFailed: shipments.filter((s: any) => s.status === 'Failed').length,
                      });
                    })
                    .catch(err => console.error('All Time Error:', err));
                }}
                className="h-9 px-4 text-sm"
              >
                All Time
              </Button>

              {/* Reset Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDateRange('today');
                  setCustomStart(undefined);
                  setCustomEnd(undefined);
                  setDropdownOpen(false);
                  // Fetch today's data
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const from = today.toISOString().split('T')[0];
                  const to = tomorrow.toISOString().split('T')[0];
                  fetch(`/api/shipments?from=${from}&to=${to}`, { credentials: 'include' })
                    .then(res => {
                      if (!res.ok) throw new Error(`Failed: ${res.status}`);
                      return res.json();
                    })
                    .then((shipments: any[]) => {
                      console.log(`Fetched ${shipments.length} shipments on reset`);
                      setKpis({
                        totalCreated: shipments.length,
                        totalDelivered: shipments.filter((s: any) => s.status === 'Delivered').length,
                        totalFailed: shipments.filter((s: any) => s.status === 'Failed').length,
                      });
                    })
                    .catch(err => console.error('Reset Error:', err));
                }}
                className="h-9 px-4 text-sm"
              >
                Reset
              </Button>
            </div>
          </div>
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

        {/* Main Content - Shipment Overview (Left) & Operational Stats (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Shipment Overview Chart - Left Side (takes 2 columns) */}
          <div className="lg:col-span-2">
            <ShipmentOverviewChart
              dateRange={chartDateRange}
              onDateRangeChange={setChartDateRange}
            />
          </div>

          {/* Operational Stats - Right Side (compact & detailed) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 px-2">Operational Status</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg border border-blue-200/60 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Ready for Assignment</p>
                      <p className="text-xs text-gray-500 mt-0.5">Action Required</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-900">{readyForAssignment.length}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-red-200/60 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Failed Deliveries</p>
                      <p className="text-xs text-gray-500 mt-0.5">Needs Attention</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-900">{failedDeliveries.length}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-purple-200/60 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Incoming Manifests</p>
                      <p className="text-xs text-gray-500 mt-0.5">In Transit</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-purple-900">{incomingManifests.length}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-teal-200/60 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-teal-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Outgoing Manifests</p>
                      <p className="text-xs text-gray-500 mt-0.5">In Transit</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-teal-900">{outgoingManifests.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Shipments Table */}
        <div>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-lg font-bold text-gray-900">Recent Activity</h2>
          </div>

          <ModernTable
            headers={['Tracking ID', 'Recipient', 'Status', 'Date']}
            data={[...readyForAssignment, ...failedDeliveries].slice(0, 5)}
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


