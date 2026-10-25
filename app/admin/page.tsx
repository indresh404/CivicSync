"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar, { AdminTab } from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import MapComponent from "@/components/MapComponent";
import RegisterProjectModal from "@/components/RegisterProjectModal";
import ProjectDrawer from "@/components/ProjectDrawer";
import ConflictDetailModal from "@/components/ConflictDetailModal";
import GanttChartView from "@/components/GanttChartView";
import {
  Project,
  Conflict,
  AuditLog,
  DashboardStats,
  DepartmentRole,
  SimulatedRole,
  RoadHistoryResponse,
} from "@/lib/types";
import {
  fetchProjects,
  fetchConflicts,
  fetchAuditLogs,
  fetchDashboardStats,
  resetSystemBaseline,
  approveProject,
  overrideProject,
  fetchRoadHistory,
} from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getSeverityBadgeClass,
} from "@/lib/utils";
import {
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
  Eye,
  RefreshCw,
  TrendingDown,
  Info,
  DollarSign,
  Building,
  Check,
  Search,
  CalendarRange,
  Table,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboardPage() {
  const [currentTab, setCurrentTab] = useState<AdminTab>("overview");
  const [currentRole, setCurrentRole] = useState<DepartmentRole>(
    "City Administrator (Approver)"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals & Drawer states
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [drawerProject, setDrawerProject] = useState<Project | null>(null);
  const [activeConflictModal, setActiveConflictModal] = useState<Conflict | null>(null);

  // Filter states for Projects tab
  const [projDeptFilter, setProjDeptFilter] = useState("ALL");
  const [projStatusFilter, setProjStatusFilter] = useState("ALL");
  const [projTypeFilter, setProjTypeFilter] = useState("ALL");
  const [projectsViewMode, setProjectsViewMode] = useState<"table" | "gantt">("table");

  // Filter states for Conflicts tab
  const [confSeverityFilter, setConfSeverityFilter] = useState("ALL");
  const [confStatusFilter, setConfStatusFilter] = useState("ALL");

  // Filter states for Audit tab
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");

  // Road History Tab state
  const [selectedRoadForHistory, setSelectedRoadForHistory] = useState("Mira Bhayandar Road");
  const [roadHistoryData, setRoadHistoryData] = useState<RoadHistoryResponse | null>(null);
  const [loadingRoadHistory, setLoadingRoadHistory] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [projList, confList, auditList, stats] = await Promise.all([
        fetchProjects(),
        fetchConflicts(),
        fetchAuditLogs(),
        fetchDashboardStats(),
      ]);
      setProjects(projList);
      setConflicts(confList);
      setAuditLogs(auditList);
      setDashboardStats(stats);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
      showToast("Municipal Grid synchronized: 19 infrastructure projects up to date.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Restore session if user signed in via login page
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("civicsync_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u.role === "ADMIN") {
            setCurrentRole("City Administrator (Approver)");
          } else if (u.department_name) {
            setCurrentRole(u.department_name as DepartmentRole);
          }
        } catch (e) {
          console.warn("Could not parse stored session:", e);
        }
      }
    }
    loadAllData();
  }, []);

  useEffect(() => {
    async function loadRoadHistory() {
      if (currentTab !== "road_history" && !drawerProject) return;
      setLoadingRoadHistory(true);
      try {
        const data = await fetchRoadHistory(selectedRoadForHistory);
        setRoadHistoryData(data);
      } catch (err) {
        console.warn("Could not load road history:", err);
      } finally {
        setLoadingRoadHistory(false);
      }
    }
    loadRoadHistory();
  }, [currentTab, selectedRoadForHistory]);

  const handleResetBaseline = async () => {
    if (confirm("Synchronize municipal coordination grid to standard baseline?")) {
      await resetSystemBaseline();
      await loadAllData();
      showToast("Municipal coordination grid synchronized to baseline.");
    }
  };

  const handleProjectCreated = (newProj: Project) => {
    loadAllData();
    showToast(`Project ${newProj.id} registered. Conflict analysis executed.`);
  };

  const handleConflictAcknowledged = (conflictId: string) => {
    loadAllData();
    showToast(`Conflict ${conflictId} departmental acknowledgment recorded.`);
  };

  // Active conflicts count for badges
  const activeConflictsCount = conflicts.filter((c) => c.status !== "Closed").length;

  // Filtered lists based on search & tab filters
  const filteredProjects = projects.filter((p) => {
    if (projDeptFilter !== "ALL" && p.department !== projDeptFilter) return false;
    if (projStatusFilter !== "ALL" && p.status !== projStatusFilter) return false;
    if (projTypeFilter !== "ALL" && p.project_type !== projTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.road_name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredConflicts = conflicts.filter((c) => {
    if (confSeverityFilter !== "ALL" && c.severity_level !== confSeverityFilter) return false;
    if (confStatusFilter !== "ALL" && c.status !== confStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        (c.road_name && c.road_name.toLowerCase().includes(q)) ||
        (c.project_a_name && c.project_a_name.toLowerCase().includes(q)) ||
        (c.project_b_name && c.project_b_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter((l) => {
    if (auditActionFilter !== "ALL" && l.action_type !== auditActionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.note.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const plannedProjectsForApproval = projects.filter((p) => p.status === "Planned");

  // Chart data
  const statusPieData = dashboardStats?.status_distribution
    ? Object.entries(dashboardStats.status_distribution).map(([name, value]) => ({
        name,
        value,
      }))
    : [
        { name: "Planned", value: projects.filter((p) => p.status === "Planned").length },
        { name: "Approved", value: projects.filter((p) => p.status === "Approved").length },
        { name: "Ongoing", value: projects.filter((p) => p.status === "Ongoing").length },
        { name: "Completed", value: projects.filter((p) => p.status === "Completed").length },
      ];
  const statusColors = ["#2563EB", "#4338CA", "#0891B2", "#64748B"];

  const deptBarData = dashboardStats?.department_distribution
    ? dashboardStats.department_distribution.map((d) => ({
        name: d.department.replace(" Department", ""),
        count: d.count ?? d.project_count ?? 1,
      }))
    : [];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Persistent Sidebar (Desktop) */}
      <div className="hidden md:flex">
        <AdminSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentRole={currentRole}
          onChangeRole={setCurrentRole}
          activeConflictCount={activeConflictsCount}
          onResetBaseline={handleResetBaseline}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 bg-slate-900">
            <AdminSidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setMobileSidebarOpen(false);
              }}
              currentRole={currentRole}
              onChangeRole={setCurrentRole}
              activeConflictCount={activeConflictsCount}
              onResetBaseline={handleResetBaseline}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader
          title={
            currentTab === "overview"
              ? "Municipal Operations Overview"
              : currentTab === "projects"
              ? "Project Management"
              : currentTab === "gantt"
              ? "Municipal Master Gantt Schedule"
              : currentTab === "map"
              ? "Shared City Infrastructure Map"
              : currentTab === "conflicts"
              ? "Corridor Conflict Gate"
              : currentTab === "road_history"
              ? "Road Excavation History & Cooldown Timeline"
              : currentTab === "approvals"
              ? "Inter-Departmental Approval Queue"
              : "Append-Only Audit Trail"
          }
          subtitle={`Active Department Session: ${currentRole}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenRegisterModal={() => setRegisterModalOpen(true)}
          activeConflictCount={activeConflictsCount}
          currentRole={currentRole}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Tab View Container */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
              {/* Top Syncing Status Banner */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Synchronizing Municipal Grid Core...
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Fetching 19 cross-agency projects, spatial conflict graphs, and GIS layers
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-24 bg-slate-100 rounded-full" />
                </div>
              </div>

              {/* 7 KPI Cards Skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
                    <div className="h-2.5 w-16 bg-slate-200 rounded" />
                    <div className="h-7 w-12 bg-slate-300 rounded" />
                    <div className="h-2 w-20 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>

              {/* Middle Section Skeleton (Charts/Map) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-72 rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-52 w-full bg-slate-100/70 rounded-xl" />
                </div>
                <div className="h-72 rounded-2xl bg-white border border-slate-200 p-5 space-y-4 shadow-xs">
                  <div className="h-4 w-36 bg-slate-200 rounded" />
                  <div className="h-52 w-full bg-slate-100/70 rounded-xl" />
                </div>
              </div>

              {/* Bottom Table Skeleton */}
              <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="h-4 w-52 bg-slate-200 rounded" />
                <div className="space-y-2 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-50 rounded-lg border border-slate-100" />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* 1. OVERVIEW DASHBOARD */}
              {/* ============================================================ */}
              {currentTab === "overview" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* 7 KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Total Projects */}
                <div
                  onClick={() => setCurrentTab("projects")}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-slate-500">Total Projects</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {dashboardStats?.kpis.total_projects ?? projects.length}
                  </div>
                  <span className="text-[10px] text-blue-600 font-medium">All corridors &rarr;</span>
                </div>

                {/* Planned */}
                <div
                  onClick={() => {
                    setProjStatusFilter("Planned");
                    setCurrentTab("projects");
                  }}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-blue-600">Planned</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {dashboardStats?.kpis.planned ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Awaiting gate</span>
                </div>

                {/* Approved */}
                <div
                  onClick={() => {
                    setProjStatusFilter("Approved");
                    setCurrentTab("projects");
                  }}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-indigo-700">Approved</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {dashboardStats?.kpis.approved ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Ready to tender</span>
                </div>

                {/* Ongoing */}
                <div
                  onClick={() => {
                    setProjStatusFilter("Ongoing");
                    setCurrentTab("projects");
                  }}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-cyan-700">Ongoing</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {dashboardStats?.kpis.ongoing ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Active digging</span>
                </div>

                {/* Completed */}
                <div
                  onClick={() => {
                    setProjStatusFilter("Completed");
                    setCurrentTab("projects");
                  }}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-slate-600">Completed</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                    {dashboardStats?.kpis.completed ?? 0}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Restored</span>
                </div>

                {/* Active Conflicts */}
                <div
                  onClick={() => setCurrentTab("conflicts")}
                  className="p-3.5 rounded-xl bg-red-50/60 border border-red-200 hover:border-red-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    Active Conflicts
                  </span>
                  <div className="text-2xl font-bold text-red-700 mt-1 font-mono">
                    {dashboardStats?.kpis.active_conflicts ?? activeConflictsCount}
                  </div>
                  <span className="text-[10px] text-red-600 font-medium">Gate hold active</span>
                </div>

                {/* Awaiting Acknowledgment */}
                <div
                  onClick={() => {
                    setConfStatusFilter("Awaiting Acknowledgment");
                    setCurrentTab("conflicts");
                  }}
                  className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 hover:border-amber-400 cursor-pointer transition shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pending Acks
                  </span>
                  <div className="text-2xl font-bold text-amber-800 mt-1 font-mono">
                    {dashboardStats?.kpis.awaiting_acknowledgment ?? 0}
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium">Depts review</span>
                </div>
              </div>

              {/* Illustrative Estimated Avoided Cost Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                      Illustrative Estimated Avoided Cost (MBMC Area)
                    </span>
                    <span className="text-[10px] bg-blue-800/80 text-blue-200 px-2 py-0.5 rounded border border-blue-700 flex items-center gap-1">
                      <Info className="w-3 h-3" /> Standard Assumption
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white flex items-center gap-1">
                    <span>&#8377;</span>
                    <span>
                      {(dashboardStats?.kpis.illustrative_avoided_cost ?? 700000).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 max-w-xl">
                    {dashboardStats?.kpis.cost_assumption_note ||
                      "Calculated transparently: prevented re-dig events * ₹3,50,000 assumed per-dig municipal excavation & restoration cost."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab("conflicts")}
                  className="px-4 py-2 rounded-lg bg-white text-blue-900 font-semibold text-xs hover:bg-blue-50 transition shrink-0 flex items-center gap-1.5 shadow"
                >
                  View Prevented Conflicts
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Conflict Summary Table & Upcoming Work */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Conflicts Summary (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Active Spatial & Schedule Conflicts
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Overlapping municipal roadworks requiring departmental synchronization
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentTab("conflicts")}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      View All ({conflicts.length}) &rarr;
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Conflict ID</th>
                          <th className="py-2.5 px-4">Road Corridor</th>
                          <th className="py-2.5 px-4">Departments</th>
                          <th className="py-2.5 px-4">Overlap</th>
                          <th className="py-2.5 px-4">Severity</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {conflicts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Zero active conflicts detected across all registered projects.
                            </td>
                          </tr>
                        ) : (
                          conflicts.map((c) => (
                            <tr
                              key={c.id}
                              onClick={() => setActiveConflictModal(c)}
                              className="hover:bg-slate-50/80 cursor-pointer transition"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                {c.id}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900">
                                {c.road_name || "MG Road"}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <div className="text-[11px]">
                                  {c.project_a_dept} &bull; {c.project_b_dept}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-700">
                                {c.overlapping_days} days ({c.calculated_distance}m)
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityBadgeClass(
                                    c.severity_level
                                  )}`}
                                >
                                  {c.severity_level}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-[11px] text-slate-600">
                                {c.status}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveConflictModal(c);
                                  }}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                >
                                  Inspect &rarr;
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Flagged Roads & Conflict Trends (1 col) */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">
                      Most Frequently Flagged Roads
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Road corridors with multiple overlapping infrastructure requests
                    </p>

                    <div className="space-y-3">
                      {(dashboardStats?.top_flagged_roads || []).map((road, i) => (
                        <div
                          key={road.road_name}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                              {i + 1}
                            </span>
                            <span className="font-semibold text-slate-900">{road.road_name}</span>
                          </div>
                          <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 text-[11px]">
                            {road.flagged_conflicts ?? road.conflict_count ?? 0} Conflict{(road.flagged_conflicts ?? road.conflict_count ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Conflict Severity Breakdown
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                        <div className="font-bold text-red-700 font-mono text-base">
                          {dashboardStats?.severity_distribution?.High ?? conflicts.filter((c) => c.severity_level === "High").length}
                        </div>
                        <span className="text-[10px] text-red-600 font-medium">High</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="font-bold text-amber-700 font-mono text-base">
                          {dashboardStats?.severity_distribution?.Medium ?? conflicts.filter((c) => c.severity_level === "Medium").length}
                        </div>
                        <span className="text-[10px] text-amber-600 font-medium">Medium</span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="font-bold text-emerald-700 font-mono text-base">
                          {dashboardStats?.severity_distribution?.Low ?? conflicts.filter((c) => c.severity_level === "Low").length}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">Low</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section: Department Distribution & Status Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Department Distribution Bar Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 mb-1">
                    Department-wise Project Volume
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Active and planned public works categorized by municipal department
                  </p>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Distribution Pie Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <h3 className="font-bold text-sm text-slate-900 mb-1">
                    Lifecycle Status Distribution
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Proportion of works across Planned, Approved, Ongoing, and Completed stages
                  </p>
                  <div className="h-56 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Upcoming Work Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Upcoming Infrastructure Works
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scheduled corridor projects in chronological order
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentTab("projects")}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View All Projects &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Project ID</th>
                        <th className="py-2.5 px-4">Project Name</th>
                        <th className="py-2.5 px-4">Department</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Schedule</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projects.slice(0, 5).map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setDrawerProject(p)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                          <td className="py-3 px-4 text-slate-600">{p.department}</td>
                          <td className="py-3 px-4 text-slate-600">{p.project_type}</td>
                          <td className="py-3 px-4 text-slate-700">{p.road_name}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {formatDate(p.start_date)} – {formatDate(p.end_date)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusBadgeClass(
                                p.status
                              )}`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. PROJECTS TAB */}
          {/* ============================================================ */}
          {currentTab === "projects" && (
            <div className="space-y-4 max-w-7xl mx-auto">
              {/* Filter Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  {/* Department Filter */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      Department
                    </label>
                    <select
                      value={projDeptFilter}
                      onChange={(e) => setProjDeptFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Departments</option>
                      <option value="Roads Department">Roads Dept</option>
                      <option value="Water Department">Water Dept</option>
                      <option value="Electricity Department">Electricity Dept</option>
                      <option value="Telecom Department">Telecom Dept</option>
                      <option value="Gas Department">Gas Dept</option>
                      <option value="Sewerage Department">Sewerage Dept</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      Status
                    </label>
                    <select
                      value={projStatusFilter}
                      onChange={(e) => setProjStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Planned">Planned</option>
                      <option value="Approved">Approved</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Project Type Filter */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      Type
                    </label>
                    <select
                      value={projTypeFilter}
                      onChange={(e) => setProjTypeFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Types</option>
                      <option value="Resurfacing">Resurfacing</option>
                      <option value="Pipeline">Pipeline</option>
                      <option value="Cabling">Cabling</option>
                      <option value="Sewerage">Sewerage</option>
                      <option value="Gas line">Gas Line</option>
                    </select>
                  </div>

                  {/* Reset Filters */}
                  {(projDeptFilter !== "ALL" ||
                    projStatusFilter !== "ALL" ||
                    projTypeFilter !== "ALL" ||
                    searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setProjDeptFilter("ALL");
                        setProjStatusFilter("ALL");
                        setProjTypeFilter("ALL");
                        setSearchQuery("");
                      }}
                      className="mt-4 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setProjectsViewMode("table")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                        projectsViewMode === "table"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      Table View
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectsViewMode("gantt")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                        projectsViewMode === "gantt"
                          ? "bg-white text-blue-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                      Gantt Schedule
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    Showing {filteredProjects.length} of {projects.length} registered projects
                  </div>
                </div>
              </div>

              {/* Projects Table or Gantt View */}
              {projectsViewMode === "gantt" ? (
                <GanttChartView
                  projects={filteredProjects}
                  conflicts={conflicts}
                  onSelectProject={(p) => setDrawerProject(p)}
                  onSelectConflict={(c) => setActiveConflictModal(c)}
                />
              ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Project ID</th>
                        <th className="py-3 px-4">Project Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Road / Location</th>
                        <th className="py-3 px-4">Road Type</th>
                        <th className="py-3 px-4">Execution Dates</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Conflict Flag</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProjects.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            No projects match the selected search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProjects.map((p) => {
                          const hasConf = (p.active_conflicts_count ?? 0) > 0 || p.has_conflicts;
                          return (
                            <tr
                              key={p.id}
                              onClick={() => setDrawerProject(p)}
                              className="hover:bg-slate-50/80 cursor-pointer transition"
                            >
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                {p.id}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                                {p.name}
                              </td>
                              <td className="py-3 px-4 text-slate-600">{p.department}</td>
                              <td className="py-3 px-4 text-slate-600">{p.project_type}</td>
                              <td className="py-3 px-4 text-slate-800 font-medium">
                                {p.road_name}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                    p.road_type === "Arterial"
                                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {p.road_type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                {formatDate(p.start_date)} – {formatDate(p.end_date)}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusBadgeClass(
                                    p.status
                                  )}`}
                                >
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {hasConf ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                    <AlertTriangle className="w-3 h-3 text-red-600" />
                                    Conflicting
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                    Clear
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDrawerProject(p);
                                  }}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  Details &rarr;
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* GANTT SCHEDULE TAB */}
          {/* ============================================================ */}
          {currentTab === "gantt" && (
            <div className="max-w-7xl mx-auto space-y-4">
              <GanttChartView
                projects={projects}
                conflicts={conflicts}
                onSelectProject={(p) => setDrawerProject(p)}
                onSelectConflict={(c) => setActiveConflictModal(c)}
              />
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. CITY MAP TAB */}
          {/* ============================================================ */}
          {currentTab === "map" && (
            <div className="h-[calc(100vh-140px)] w-full">
              <MapComponent
                projects={projects}
                conflicts={conflicts}
                selectedProjectId={drawerProject?.id}
                onSelectProject={(p) => setDrawerProject(p)}
                selectedConflict={activeConflictModal}
              />
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. CONFLICTS TAB */}
          {/* ============================================================ */}
          {currentTab === "conflicts" && (
            <div className="space-y-4 max-w-7xl mx-auto">
              {/* Filter Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      Severity
                    </label>
                    <select
                      value={confSeverityFilter}
                      onChange={(e) => setConfSeverityFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="High">High Severity</option>
                      <option value="Medium">Medium Severity</option>
                      <option value="Low">Low Severity</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                      Status
                    </label>
                    <select
                      value={confStatusFilter}
                      onChange={(e) => setConfStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Awaiting Acknowledgment">Awaiting Acknowledgment</option>
                      <option value="Ready for Review">Ready for Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Overridden">Overridden</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-500">
                  {filteredConflicts.length} active corridor conflict records
                </div>
              </div>

              {/* Conflicts Card List */}
              <div className="space-y-3">
                {filteredConflicts.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                    No conflict records match the active filter criteria.
                  </div>
                ) : (
                  filteredConflicts.map((c) => {
                    const ackedCount = c.acknowledgments.length;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveConflictModal(c)}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer transition space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-sm text-blue-600">
                              {c.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${getSeverityBadgeClass(
                                c.severity_level
                              )}`}
                            >
                              {c.severity_level} (Score: {c.severity_score})
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              Corridor: {c.road_name || "MG Road"}
                            </span>
                          </div>

                          <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                            Status: <strong className="text-slate-800">{c.status}</strong>
                          </span>
                        </div>

                        {/* Projects Involved */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-slate-400 font-mono">{c.project_a_id}</span>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {c.project_a_name}
                            </div>
                            <span className="text-[11px] text-blue-700 font-medium">
                              {c.project_a_dept} ({c.project_a_type})
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-mono">{c.project_b_id}</span>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {c.project_b_name}
                            </div>
                            <span className="text-[11px] text-sky-700 font-medium">
                              {c.project_b_dept} ({c.project_b_type})
                            </span>
                          </div>
                        </div>

                        {/* Metrics & Reason */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                          <div className="flex items-center gap-4 text-slate-600">
                            <span>
                              Distance: <strong>{c.calculated_distance}m</strong> (&le;{c.threshold}m)
                            </span>
                            <span>
                              Overlap: <strong>{c.overlapping_days} days</strong>
                            </span>
                            <span>
                              Acknowledgments: <strong>{ackedCount} of 2</strong>
                            </span>
                          </div>

                          <button
                            type="button"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            Inspect & Acknowledge <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4.5. ROAD HISTORY TAB */}
          {/* ============================================================ */}
          {currentTab === "road_history" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Road Selector & Headline Stat */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select Municipal Corridor
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedRoadForHistory}
                      onChange={(e) => setSelectedRoadForHistory(e.target.value)}
                      className="text-base font-bold text-slate-900 py-1.5 px-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {Array.from(new Set(projects.map((p) => p.road_name))).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Headline Stat */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    {roadHistoryData?.excavations_last_12_months ?? 0}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-blue-950">
                      {roadHistoryData?.headline_stat || "Zero excavations in the last 12 months"}
                    </div>
                    <div className="text-[11px] text-blue-700">
                      Municipal 24-Month Cooldown Window Active &bull; {roadHistoryData?.total_projects ?? 0} Total Work Orders Recorded
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical Timeline */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Chronological Excavation & Resurfacing Timeline
                </h4>

                {loadingRoadHistory ? (
                  <div className="p-8 space-y-4 animate-pulse">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      <span>Loading corridor historical telemetry and cooldown window...</span>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
                      <div className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
                    </div>
                  </div>
                ) : !roadHistoryData || roadHistoryData.projects.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                    No work history recorded on this corridor yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {roadHistoryData.projects.map((item) => (
                      <div key={item.id} className="relative group">
                        {/* Bullet */}
                        <div
                          className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                            item.status === "Completed"
                              ? "bg-slate-500"
                              : item.status === "Ongoing"
                              ? "bg-cyan-600"
                              : item.status === "Approved"
                              ? "bg-indigo-600"
                              : "bg-blue-600"
                          }`}
                        />

                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-900">{item.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(item.status)}`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
                            <span className="font-semibold text-slate-800">{item.department}</span>
                            <span>&bull;</span>
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">{item.project_type}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.start_date)} to {formatDate(item.end_date)}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                          )}

                          {item.cooldown_justification && (
                            <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                              <strong>Cooldown Justification:</strong> {item.cooldown_justification}
                            </div>
                          )}

                          {item.is_overridden && (
                            <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                              <strong>Executive Override:</strong> {item.override_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. APPROVAL GATE TAB */}
          {/* ============================================================ */}
          {currentTab === "approvals" && (
            <div className="space-y-4 max-w-7xl mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Municipal Approval Gate Policy</h4>
                  <p className="mt-0.5 text-blue-800">
                    A planned excavation project cannot transition to Approved status until a conflict report check has been performed. If active conflicts exist, both departments must record acknowledgments before standard approval. City Administrators may apply logged emergency overrides.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">
                    Pending Approval Queue ({plannedProjectsForApproval.length} Planned Projects)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Role Context: <strong>{currentRole}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Project ID</th>
                        <th className="py-3 px-4">Project Name</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Conflict Status</th>
                        <th className="py-3 px-4">Approval Eligibility</th>
                        <th className="py-3 px-4 text-right">Gate Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plannedProjectsForApproval.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No projects currently awaiting approval in Planned status.
                          </td>
                        </tr>
                      ) : (
                        plannedProjectsForApproval.map((p) => {
                          const projConfs = conflicts.filter(
                            (c) => c.project_a_id === p.id || c.project_b_id === p.id
                          );
                          const hasConf = projConfs.length > 0;
                          const hasUnacked = projConfs.some(
                            (c) => c.status === "Awaiting Acknowledgment"
                          );
                          const eligible = !hasConf || !hasUnacked;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-mono font-bold text-blue-600">
                                {p.id}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                              <td className="py-3 px-4 text-slate-600">{p.department}</td>
                              <td className="py-3 px-4 text-slate-800">{p.road_name}</td>
                              <td className="py-3 px-4">
                                {hasConf ? (
                                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                    {projConfs.length} Conflict(s)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                    Clean Check
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {eligible ? (
                                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Eligible for Approval
                                  </span>
                                ) : (
                                  <span className="font-semibold text-amber-700 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Blocked (Awaiting Dept Acks)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setDrawerProject(p)}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded-lg"
                                >
                                  Inspect
                                </button>
                                <button
                                  type="button"
                                  disabled={!eligible}
                                  onClick={async () => {
                                    try {
                                      await approveProject(p.id, `${currentRole} Official`);
                                      loadAllData();
                                      showToast(`Project ${p.id} approved.`);
                                    } catch (err: any) {
                                      alert(err.message || "Approval rejected");
                                    }
                                  }}
                                  className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1 rounded-lg transition"
                                >
                                  Approve
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 6. AUDIT TRAIL TAB */}
          {/* ============================================================ */}
          {currentTab === "audit" && (
            <div className="space-y-4 max-w-7xl mx-auto">
              {/* Filter Toolbar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <label className="text-slate-600 font-semibold">Filter by Action:</label>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                  >
                    <option value="ALL">All Recorded Actions</option>
                    <option value="PROJECT_CREATED">Project Created</option>
                    <option value="CONFLICT_DETECTED">Conflict Detected</option>
                    <option value="REPORT_GENERATED">Report Generated</option>
                    <option value="DEPARTMENT_ACKNOWLEDGED">Department Acknowledged</option>
                    <option value="ADMIN_OVERRIDE">Admin Override</option>
                    <option value="APPROVAL_GRANTED">Approval Granted</option>
                    <option value="STATUS_CHANGED">Status Changed</option>
                  </select>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredAuditLogs.length} append-only events
                </div>
              </div>

              {/* Audit Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Event ID</th>
                        <th className="py-3 px-4">Action Type</th>
                        <th className="py-3 px-4">Target Ref</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Audit Note / Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-700">{log.id}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                log.action_type === "ADMIN_OVERRIDE"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : log.action_type === "APPROVAL_GRANTED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : log.action_type === "CONFLICT_DETECTED"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {log.action_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-blue-600 font-semibold">
                            {log.project_id || log.conflict_id || "—"}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-900 font-medium">
                            {log.actor}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600">
                            {log.department}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-700 max-w-md">
                            {log.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </main>
      </div>

      {/* Register Project Modal */}
      <RegisterProjectModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleProjectCreated}
        currentRole={currentRole}
      />

      {/* Project Detail Drawer */}
      <ProjectDrawer
        project={drawerProject}
        conflicts={conflicts}
        isOpen={!!drawerProject}
        onClose={() => setDrawerProject(null)}
        onUpdate={() => {
          loadAllData();
          setDrawerProject(null);
        }}
        onSelectConflict={(c) => {
          setDrawerProject(null);
          setActiveConflictModal(c);
        }}
        onViewRoadHistory={(roadName) => {
          setDrawerProject(null);
          setSelectedRoadForHistory(roadName);
          setCurrentTab("road_history");
        }}
        currentRole={currentRole}
      />

      {/* Conflict Detail Modal */}
      <ConflictDetailModal
        conflict={activeConflictModal}
        isOpen={!!activeConflictModal}
        onClose={() => setActiveConflictModal(null)}
        onAcknowledged={handleConflictAcknowledged}
        currentRole={currentRole}
      />
    </div>
  );
}
