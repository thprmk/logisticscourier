"use client";

import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { KPICard, ModernTable, StatCard } from "./DashboardComponents";
import ShipmentOverviewChart from "../components/ShipmentOverviewChart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
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
    "week" | "month" | "last3months" | "year"
  >("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

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
      case "week":
        start = new Date(today);
        const dayOfWeek = today.getDay();
        start.setDate(today.getDate() - dayOfWeek); // Start of current week (Sunday)
        end = tomorrow;
        break;
      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case "last3months":
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        end = tomorrow;
        break;
      case "year":
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear() + 1, 0, 1);
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

  const fetchKPIsWithCustomDates = async (startDate: string, endDate: string) => {
    try {
      setKpisLoading(true);
      // Add one day to endDate to include the end date in the range
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      const endDateStr = endDatePlusOne.toISOString().split("T")[0];
      
      const response = await fetch(
        `/api/shipments?from=${startDate}&to=${endDateStr}`,
        { credentials: "include" }
      );

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

  const handleApplyFilter = () => {
    if (filterStart && filterEnd) {
      fetchKPIsWithCustomDates(filterStart, filterEnd);
      // Add one day to endDate to include the end date in the range
      const endDatePlusOne = new Date(filterEnd);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      const endDateStr = endDatePlusOne.toISOString().split("T")[0];
      fetchOperationalData(filterStart, endDateStr);
    }
  };

  const handleAllTime = () => {
    setFilterStart("");
    setFilterEnd("");
    try {
      setKpisLoading(true);
      const from = "2020-01-01";
      const to = new Date().toISOString().split("T")[0];
      
      fetch(`/api/shipments?from=${from}&to=${to}`, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
        .then((shipments: IShipment[]) => {
          setKpis({
            totalCreated: shipments.length,
            totalDelivered: shipments.filter((s) => s.status === "Delivered")
              .length,
            totalFailed: shipments.filter((s) => s.status === "Failed").length,
          });
        })
        .catch((err) => console.error(err))
        .finally(() => setKpisLoading(false));
    } catch (err) {
      console.error(err);
      setKpisLoading(false);
    }
    // Fetch all time operational data
    const endDatePlusOne = new Date();
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    const endDateStr = endDatePlusOne.toISOString().split("T")[0];
    fetchOperationalData("2020-01-01", endDateStr);
  };

  const handleReset = () => {
    setFilterStart("");
    setFilterEnd("");
    setDateRange("week");
    fetchKPIs();
    fetchOperationalData();
  };

  const fetchOperationalData = async (startDate?: string, endDate?: string) => {
    try {
      setOperationalLoading(true);

      let shipmentsUrl = "/api/shipments";
      let manifestsUrl = "/api/manifests";
      
      // If date range is provided, add it to the API call
      if (startDate && endDate) {
        shipmentsUrl += `?from=${startDate}&to=${endDate}`;
        manifestsUrl += `?from=${startDate}&to=${endDate}`;
      }

      const shipmentsRes = await fetch(shipmentsUrl, {
        credentials: "include",
      });
      const manifestsRes = await fetch(manifestsUrl, {
        credentials: "include",
      });

      if (!shipmentsRes.ok || !manifestsRes.ok)
        throw new Error("Failed to fetch data");

      const shipmentsData: any = await shipmentsRes.json();
      const manifestsData: any = await manifestsRes.json();

      // Handle both array and object responses
      const shipments: IShipment[] = Array.isArray(shipmentsData) ? shipmentsData : shipmentsData.data || [];
      const manifests: IManifest[] = Array.isArray(manifestsData) ? manifestsData : manifestsData.data || [];

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
      console.error("Operational data error:", err);
      // Set empty arrays on error
      setReadyForAssignment([]);
      setFailedDeliveries([]);
      setIncomingManifests([]);
      setOutgoingManifests([]);
    } finally {
      setOperationalLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [dateRange]);

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
      <div className="bg-transparent border-b border-gray-200/50 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            {/* Left Side */}
            <div>
              <h1 className="text-4xl sm:text-3xl font-bold text-gray-900 leading-tight">{user?.tenantName || 'Branch'}</h1>
              <p className="text-sm text-gray-500 mt-2">Welcome back, <span className="text-gray-700 font-medium">{user?.name || 'User'}</span></p>
            </div>

            {/* Right Side - Date Range and Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-4 text-sm font-medium text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
                  >
                    {filterStart && filterEnd
                      ? `${format(new Date(filterStart), 'MMM dd')} - ${format(new Date(filterEnd), 'MMM dd')}`
                      : filterStart
                      ? `${format(new Date(filterStart), 'MMM dd')} - Pick end`
                      : 'Pick date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-0">
                    <div className="p-3">
                      <Label className="text-xs mb-2 block">Start Date</Label>
                      <Calendar
                        mode="single"
                        selected={filterStart ? new Date(filterStart) : undefined}
                        onSelect={(date) => setFilterStart(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) =>
                          filterEnd ? date > new Date(filterEnd) : false
                        }
                      />
                    </div>
                    <div className="p-3">
                      <Label className="text-xs mb-2 block">End Date</Label>
                      <Calendar
                        mode="single"
                        selected={filterEnd ? new Date(filterEnd) : undefined}
                        onSelect={(date) => setFilterEnd(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) =>
                          filterStart ? date < new Date(filterStart) : false
                        }
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button onClick={handleApplyFilter} className="h-10 px-6 font-semibold" disabled={!filterStart || !filterEnd}>
                Apply
              </Button>
              <Button onClick={handleAllTime} variant="outline" className="h-10 px-6 font-semibold text-gray-700 border-gray-300">
                All Time
              </Button>
              <Button onClick={handleReset} variant="ghost" className="h-10 px-6 font-semibold text-gray-600 hover:text-gray-900">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* KPI Grid - Delivery Staff Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-blue-200/60 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">Total Shipments</p>
                <p className="text-4xl font-bold text-blue-900 mt-3 font-mono">{kpis.totalCreated}</p>
              </div>
              <div className="bg-blue-500/15 rounded-2xl p-4">
                <Package className="h-10 w-10 text-blue-600" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-green-200/60 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-widest">Delivered</p>
                <p className="text-4xl font-bold text-green-900 mt-3 font-mono">{kpis.totalDelivered}</p>
              </div>
              <div className="bg-green-500/15 rounded-2xl p-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200/60 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-widest">Failed</p>
                <p className="text-4xl font-bold text-red-900 mt-3 font-mono">{kpis.totalFailed}</p>
              </div>
              <div className="bg-red-500/15 rounded-2xl p-4">
                <AlertCircle className="h-10 w-10 text-red-600" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-orange-200/60 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-widest">Success Rate</p>
                <p className="text-4xl font-bold text-orange-900 mt-3 font-mono">{successRate}%</p>
              </div>
              <div className="bg-orange-500/15 rounded-2xl p-4">
                <CheckCircle2 className="h-10 w-10 text-orange-600" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Shipment Overview Chart with Operational Stats Collage */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Chart - Left Side (3 columns = 60%) */}
          <div className="lg:col-span-3">
            <ShipmentOverviewChart
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          {/* Operational Stats - Right Side (2 columns = 40% - 2x2 grid) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-2 h-fit">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-lg px-2 py-1.5 border border-blue-200/40 text-center">
              <Package className="h-4 w-4 text-blue-600 mx-auto" strokeWidth={1.5} />
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Ready for Assignment</p>
              <p className="text-xl font-bold text-blue-900">{readyForAssignment.length}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100/40 rounded-lg px-2 py-1.5 border border-red-200/40 text-center">
              <AlertCircle className="h-4 w-4 text-red-600 mx-auto" strokeWidth={1.5} />
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Failed Deliveries</p>
              <p className="text-xl font-bold text-red-900">{failedDeliveries.length}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100/40 rounded-lg px-2 py-1.5 border border-purple-200/40 text-center">
              <Package className="h-4 w-4 text-purple-600 mx-auto" strokeWidth={1.5} />
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Incoming Manifests</p>
              <p className="text-xl font-bold text-purple-900">{incomingManifests.length}</p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100/40 rounded-lg px-2 py-1.5 border border-teal-200/40 text-center">
              <Send className="h-4 w-4 text-teal-600 mx-auto" strokeWidth={1.5} />
              <p className="text-xs font-medium text-teal-600 uppercase tracking-wider">Outgoing Manifests</p>
              <p className="text-xl font-bold text-teal-900">{outgoingManifests.length}</p>
            </div>
          </div>
        </div>

        {/* Recent Shipments Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

          <ModernTable
            headers={['Tracking ID', 'Recipient', 'Status', 'Date']}
            data={[...readyForAssignment, ...failedDeliveries].slice(0, 8)}
            isLoading={operationalLoading}
            emptyMessage="No recent shipments found"
            renderRow={(shipment, i) => (
              <tr key={shipment._id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 sm:px-6 py-3 sm:py-4">
                  <span className="text-sm font-medium text-gray-900 font-mono group-hover:text-blue-600 transition-colors cursor-pointer">
                    {shipment.trackingId}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 font-medium">{shipment.recipient.name}</span>
                    <span className="text-xs text-gray-500 truncate max-w-[250px]">{shipment.recipient.address}</span>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    shipment.status === "Failed"
                      ? "bg-red-100 text-red-700"
                      : shipment.status === "At Destination Branch"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                  }`}>
                    {shipment.status}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-600 font-medium">
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


