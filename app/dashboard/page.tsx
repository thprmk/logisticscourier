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

      if (!shipmentsRes.ok) throw new Error("Failed to fetch shipments");

      const shipments: IShipment[] = await shipmentsRes.json();
      
      // 👇 FIX: Handle both direct array and wrapped object responses from /api/manifests
      let manifests: IManifest[] = []; // Default to empty array for safety
      if (manifestsRes.ok) {
        const manifestsData = await manifestsRes.json();
        console.log('Manifests API response:', manifestsData);
        
        // Check if it's an array (direct response)
        if (Array.isArray(manifestsData)) {
          manifests = manifestsData;
        }
        // Check if it has a .data property (wrapped response from pagination)
        else if (manifestsData?.data && Array.isArray(manifestsData.data)) {
          manifests = manifestsData.data;
        }
        // Otherwise warn and keep empty array
        else {
          console.warn('API /api/manifests returned unexpected format:', manifestsData);
        }
      } else {
        console.error('Failed to fetch manifests, status:', manifestsRes.status);
      }

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            {/* Left: Branch Name and Welcome */}
            <div className="flex-1 min-w-0 mb-2 sm:mb-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{user?.tenantName || 'Your Branch'}</h1>
              <p className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">Welcome back, <span className="text-gray-900 font-semibold">{user?.name || 'Admin'}</span></p>
            </div>

            {/* Right: Date Range Picker with Buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
              <div className="flex-1 sm:flex-none sm:min-w-[180px] min-w-[140px]">
                <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full sm:w-auto h-8 sm:h-9 justify-start text-xs sm:text-sm font-normal text-gray-600 hover:bg-gray-100/50 border border-gray-200/50 px-2 sm:px-3"
                    >
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-gray-500 flex-shrink-0" />
                      <span className="truncate text-left hidden sm:inline">{customStart && customEnd
                        ? `${customStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${customEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`
                        : 'Pick a date range'}</span>
                      <span className="truncate text-left sm:hidden">{customStart && customEnd
                        ? `${customStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${customEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`
                        : 'Pick date'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex gap-0 flex-col sm:flex-row">
                      <div className="p-2 sm:p-3">
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
                            if (customStart && customStart.toDateString() === day.toDateString() && !customEnd) {
                              setCustomEnd(day);
                              setDateRange("custom");
                              setDropdownOpen(false);
                              setTimeout(() => handleApplyFilter(), 0);
                            }
                          }}
                        />
                      </div>
                      <div className="p-2 sm:p-3">
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

              {/* Buttons - Compact on mobile, normal on desktop */}
              <Button
                onClick={handleApplyFilter}
                disabled={!customStart || !customEnd}
                className="h-8 sm:h-9 px-1.5 sm:px-4 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
              >
                <span className="hidden sm:inline">Apply Filter</span>
                <span className="sm:hidden">Apply</span>
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDateRange('all');
                  setCustomStart(undefined);
                  setCustomEnd(undefined);
                  setDropdownOpen(false);
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
                className="h-8 sm:h-9 px-1.5 sm:px-4 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">All Time</span>
                <span className="sm:hidden">All</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDateRange('today');
                  setCustomStart(undefined);
                  setCustomEnd(undefined);
                  setDropdownOpen(false);
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
                className="h-8 sm:h-9 px-1.5 sm:px-4 text-xs sm:text-sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* KPI Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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

        {/* Main Content - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Shipment Overview Chart */}
          <div className="lg:col-span-2">
            <ShipmentOverviewChart
              dateRange={chartDateRange}
              onDateRangeChange={setChartDateRange}
            />
          </div>

          {/* Operational Stats - Responsive */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 px-2">Operational Status</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
              <div className="bg-white rounded-lg border border-blue-200/60 p-2 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Ready</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Action Required</p>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold text-blue-900 flex-shrink-0">{readyForAssignment.length}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-red-200/60 p-2 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Failed</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Needs Attention</p>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold text-red-900 flex-shrink-0">{failedDeliveries.length}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-purple-200/60 p-2 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Incoming</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">In Transit</p>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold text-purple-900 flex-shrink-0">{incomingManifests.length}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-teal-200/60 p-2 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Send className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Outgoing</p>
                      <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">In Transit</p>
                    </div>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold text-teal-900 flex-shrink-0">{outgoingManifests.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Shipments Table */}
        <div className="overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Activity</h2>
          </div>

          <div className="overflow-x-auto">
            <ModernTable
              headers={['Tracking ID', 'Recipient', 'Status', 'Date']}
              data={[...readyForAssignment, ...failedDeliveries].slice(0, 5)}
              isLoading={operationalLoading}
              emptyMessage="No recent shipments found"
              renderRow={(shipment, i) => (
                <tr key={shipment._id} className="hover:bg-gray-50/50 transition-colors group border-b border-gray-100/50">
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5">
                    <span className="text-xs sm:text-sm md:text-base font-medium text-gray-900 font-mono group-hover:text-blue-600 transition-colors break-all">
                      {shipment.trackingId}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm md:text-base text-gray-900 font-medium truncate">{shipment.recipient.name}</span>
                      <span className="text-xs text-gray-500 truncate">{shipment.recipient.address}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${shipment.status === "Failed"
                      ? "bg-red-100 text-red-700"
                      : shipment.status === "At Destination Branch"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                      }`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5 text-xs sm:text-sm text-gray-500 font-medium whitespace-nowrap">
                    {new Date(shipment.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit'
                    })}
                  </td>
                </tr>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


