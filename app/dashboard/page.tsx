"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { user } = useUser();
  const [dateRange, setDateRange] = useState<
    "today" | "yesterday" | "last7" | "month" | "custom" | "all"
  >("today");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [showCustom, setShowCustom] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chartDateRange, setChartDateRange] = useState<'week' | 'month' | 'last3months' | 'year'>('last3months');

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
      
      // Fetch incoming and outgoing manifests separately using type parameter
      const incomingRes = await fetch("/api/manifests?type=incoming&status=In Transit&limit=10", {
        credentials: "include",
      });
      const outgoingRes = await fetch("/api/manifests?type=outgoing&status=In Transit&limit=10", {
        credentials: "include",
      });

      if (!shipmentsRes.ok) throw new Error("Failed to fetch shipments");

      const shipments: IShipment[] = await shipmentsRes.json();
      
      // Handle incoming manifests response
      let incomingManifests: IManifest[] = [];
      if (incomingRes.ok) {
        const incomingData = await incomingRes.json();
        if (Array.isArray(incomingData)) {
          incomingManifests = incomingData;
        } else if (incomingData?.data && Array.isArray(incomingData.data)) {
          incomingManifests = incomingData.data;
        }
      }
      
      // Handle outgoing manifests response
      let outgoingManifests: IManifest[] = [];
      if (outgoingRes.ok) {
        const outgoingData = await outgoingRes.json();
        if (Array.isArray(outgoingData)) {
          outgoingManifests = outgoingData;
        } else if (outgoingData?.data && Array.isArray(outgoingData.data)) {
          outgoingManifests = outgoingData.data;
        }
      }

      setReadyForAssignment(
        shipments
          .filter((s) => s.status === "At Destination Branch")
          .slice(0, 8)
      );
      setFailedDeliveries(shipments.filter((s) => s.status === "Failed").slice(0, 8));
      setIncomingManifests(incomingManifests.slice(0, 5));
      setOutgoingManifests(outgoingManifests.slice(0, 5));
    } catch (err) {
      console.error('Error fetching operational data:', err);
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
          // Chart will automatically update because customStart and customEnd changed
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#1C1C1C]">
      {/* Header Section */}
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-4 sm:pt-4 sm:pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            {/* Left: Branch Name and Welcome */}
            <div className="flex-1 min-w-0 mb-3 sm:mb-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white truncate tracking-tight">{user?.tenantName || 'Your Branch'}</h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium mt-1.5">Welcome back, <span className="text-gray-900 dark:text-white font-bold">{user?.name || 'Admin'}</span></p>
            </div>

            {/* Right: Date Range Picker with Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
              <div className={`flex-1 sm:flex-none transition-all duration-200 ${customStart && customEnd ? 'sm:min-w-[220px] min-w-[160px]' : 'sm:w-auto min-w-[140px]'}`}>
                <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full sm:w-auto h-10 sm:h-11 justify-start text-sm font-medium text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 bg-white rounded-lg shadow-sm transition-all duration-200 ${customStart && customEnd ? 'sm:px-4 px-3' : 'sm:px-3 px-2'}`}
                    >
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-500 flex-shrink-0" strokeWidth={2} />
                      <span className="truncate text-left hidden sm:inline">{customStart && customEnd
                        ? `${customStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${customEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`
                        : 'Pick a date range'}</span>
                      <span className="truncate text-left sm:hidden">{customStart && customEnd
                        ? `${customStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - ${customEnd.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`
                        : 'Pick date'}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-[#222222] border-gray-200 dark:border-transparent" align="end">
                    <div className="p-3">
                      {(customStart || customEnd) && (
                        <div className="mb-3 text-xs sm:text-sm text-gray-600 px-1">
                          {customStart && customEnd && customStart.toDateString() === customEnd.toDateString() && (
                            <span>
                              <span className="font-semibold text-blue-600">Selected:</span> {customStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {customStart && customEnd && customStart.toDateString() !== customEnd.toDateString() && (
                            <span>
                              <span className="font-semibold text-blue-600">Range:</span> {customStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {customEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      )}
                        <CalendarComponent
                          mode="single"
                        selected={customStart || undefined}
                          onSelect={(date) => {
                          if (!date) return;
                          
                          // First click: set start date (single date by default)
                          if (!customStart) {
                            setCustomStart(date);
                            setCustomEnd(date);
                            setDateRange("custom");
                          }
                          // Second click: determine if range or single date
                          else if (!customEnd || customStart.toDateString() === customEnd.toDateString()) {
                            // If clicking same date, keep as single date
                            if (date.toDateString() === customStart.toDateString()) {
                              // Already selected, do nothing
                              return;
                            }
                            // If clicking before start, swap
                            else if (date < customStart) {
                              setCustomEnd(customStart);
                            setCustomStart(date);
                            setDateRange("custom");
                            }
                            // If clicking after start, create range
                            else {
                              setCustomEnd(date);
                              setDateRange("custom");
                            }
                          }
                          // Both dates exist: reset and start fresh
                          else {
                            setCustomStart(date);
                            setCustomEnd(date);
                            setDateRange("custom");
                          }
                          }}
                        disabled={(date) => false}
                      />
                      {customStart && customEnd && (
                        <div className="mt-3 pt-3 border-t flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCustomStart(undefined);
                              setCustomEnd(undefined);
                            }}
                            className="flex-1 text-xs sm:text-sm"
                          >
                            Clear
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDropdownOpen(false);
                              handleApplyFilter();
                            }}
                            className="flex-1 bg-[#25D366] hover:bg-[#22C05A] text-xs sm:text-sm"
                          >
                            Apply
                          </Button>
                      </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Buttons - Compact on mobile, normal on desktop */}
              <Button
                onClick={handleApplyFilter}
                disabled={!customStart || !customEnd}
                className="h-10 sm:h-11 px-4 sm:px-5 text-sm font-semibold bg-[#25D366] hover:bg-[#22C05A] active:bg-[#1FAD50] text-white whitespace-nowrap rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#25D366]"
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
                className="h-10 sm:h-11 px-4 sm:px-5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-200 rounded-lg shadow-sm hover:shadow transition-all duration-200"
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
                className="h-10 sm:h-11 px-4 sm:px-5 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
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
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white px-2">Operational Status</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
              {/* READY Card */}
              <div 
                onClick={() => router.push('/dashboard/shipments?status=At Destination Branch')}
                className="bg-white dark:bg-[#222222] rounded-xl border-2 border-blue-200 dark:border-transparent p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-transparent"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 sm:p-2.5 flex-shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Ready</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Shipments Ready for Delivery</p>
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-700 dark:text-blue-400 flex-shrink-0">{readyForAssignment.length}</span>
                </div>
              </div>
              {/* FAILED Card */}
              <div 
                onClick={() => router.push('/dashboard/shipments?status=Failed')}
                className="bg-white dark:bg-[#222222] rounded-xl border-2 border-red-200 dark:border-transparent p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 shadow-sm cursor-pointer hover:border-red-300 dark:hover:border-transparent"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-2 sm:p-2.5 flex-shrink-0">
                      <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wide">Failed</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Local Delivery Failed</p>
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-red-700 dark:text-red-400 flex-shrink-0">{failedDeliveries.length}</span>
                </div>
              </div>
              {/* INCOMING Card */}
              <div 
                onClick={() => router.push('/dashboard/dispatch?tab=incoming')}
                className="bg-white dark:bg-[#222222] rounded-xl border-2 border-purple-200 dark:border-transparent p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 shadow-sm cursor-pointer hover:border-purple-300 dark:hover:border-transparent"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-2 sm:p-2.5 flex-shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wide">Incoming</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Manifests from Other Branches</p>
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-purple-700 dark:text-purple-400 flex-shrink-0">{incomingManifests.length}</span>
                </div>
              </div>
              {/* OUTGOING Card */}
              <div 
                onClick={() => router.push('/dashboard/dispatch?tab=outgoing&status=In Transit')}
                className="bg-white dark:bg-[#222222] rounded-xl border-2 border-teal-200 dark:border-transparent p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-gray-900/20 transition-all duration-200 shadow-sm cursor-pointer hover:border-teal-300 dark:hover:border-transparent"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-2 sm:p-2.5 flex-shrink-0">
                      <Send className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 dark:text-teal-400" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Outgoing</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-medium">Manifests to Other Branches</p>
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-teal-700 dark:text-teal-400 flex-shrink-0">{outgoingManifests.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Shipments Table */}
        <div className="overflow-hidden">
          <div className="flex items-center justify-between mb-3 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>

          <div className="overflow-x-auto">
            <ModernTable
              headers={['Tracking ID', 'Recipient', 'Status', 'Date']}
              data={[...readyForAssignment, ...failedDeliveries].slice(0, 5)}
              isLoading={operationalLoading}
              emptyMessage="No recent shipments found"
              renderRow={(shipment, i) => (
                <tr key={shipment._id} className="hover:bg-gray-50/50 dark:hover:bg-[#0F0F0F]/50 transition-colors group border-b border-gray-100/50 dark:border-gray-700/50">
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5">
                    <span className="text-xs sm:text-sm md:text-base font-medium text-gray-900 dark:text-white font-mono group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-all">
                      {shipment.trackingId}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm md:text-base text-gray-900 dark:text-white font-medium truncate">{shipment.recipient.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{shipment.recipient.address}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${shipment.status === "Failed"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      : shipment.status === "At Destination Branch"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                      }`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 md:px-8 py-3 sm:py-5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
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


