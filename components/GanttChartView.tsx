"use client";

import React, { useState, useMemo } from "react";
import { Project, Conflict } from "@/lib/types";
import {
  Calendar,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  ShieldAlert,
  GitCommit,
  HardHat,
  Search,
  Sparkles,
  Zap,
  Droplets,
  Radio,
  Flame,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface GanttChartViewProps {
  projects: Project[];
  conflicts: Conflict[];
  onSelectProject: (project: Project) => void;
  onSelectConflict: (conflict: Conflict) => void;
}

const DEPT_INFO: Record<string, { color: string; bg: string; icon: any }> = {
  "Roads Department": { color: "#2563EB", bg: "bg-blue-600", icon: HardHat },
  "Water Department": { color: "#06B6D4", bg: "bg-cyan-600", icon: Droplets },
  "Electricity Department": { color: "#F59E0B", bg: "bg-amber-600", icon: Zap },
  "Sewerage Department": { color: "#10B981", bg: "bg-emerald-600", icon: Layers },
  "Telecom Department": { color: "#8B5CF6", bg: "bg-purple-600", icon: Radio },
  "Gas Department": { color: "#EC4899", bg: "bg-pink-600", icon: Flame },
  "Other": { color: "#64748B", bg: "bg-slate-600", icon: HardHat },
};

export default function GanttChartView({
  projects,
  conflicts,
  onSelectProject,
  onSelectConflict,
}: GanttChartViewProps) {
  // Timeline scale & view configuration
  const [viewMode, setViewMode] = useState<"days" | "weeks">("days");
  const [groupBy, setGroupBy] = useState<"department" | "corridor" | "none">("department");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [conflictsOnly, setConflictsOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Timeline baseline: 15 Oct 2026 to 31 Dec 2026 (78 days total span)
  const timelineStart = useMemo(() => new Date(2026, 9, 15), []); // 15 Oct 2026
  const timelineEnd = useMemo(() => new Date(2026, 11, 31), []);   // 31 Dec 2026
  const totalDays = useMemo(() => {
    return Math.round((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [timelineStart, timelineEnd]);

  // Timeline baseline marker (15 Nov 2026)
  const timelineMarker = useMemo(() => new Date(2026, 10, 15), []);
  const timelineMarkerOffset = useMemo(() => {
    const diff = Math.round((timelineMarker.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    return (diff / totalDays) * 100;
  }, [timelineMarker, timelineStart, totalDays]);

  // Generate day columns
  const dayColumns = useMemo(() => {
    const cols = [];
    const cur = new Date(timelineStart);
    while (cur <= timelineEnd) {
      cols.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return cols;
  }, [timelineStart, timelineEnd]);

  // Months header segments
  const monthSegments = useMemo(() => {
    return [
      { name: "October 2026", days: 17, startPct: 0, widthPct: (17 / totalDays) * 100 },
      { name: "November 2026", days: 30, startPct: (17 / totalDays) * 100, widthPct: (30 / totalDays) * 100 },
      { name: "December 2026", days: 31, startPct: (47 / totalDays) * 100, widthPct: (31 / totalDays) * 100 },
    ];
  }, [totalDays]);

  // Conflict lookup
  const conflictMap = useMemo(() => {
    const map = new Map<string, Conflict[]>();
    conflicts.forEach((c) => {
      if (!map.has(c.project_a_id)) map.set(c.project_a_id, []);
      if (!map.has(c.project_b_id)) map.set(c.project_b_id, []);
      map.get(c.project_a_id)!.push(c);
      map.get(c.project_b_id)!.push(c);
    });
    return map;
  }, [conflicts]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterDept !== "ALL" && p.department !== filterDept) return false;
      if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
      if (conflictsOnly && !conflictMap.has(p.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q);
        const matchesRoad = p.road_name.toLowerCase().includes(q);
        const matchesId = p.id.toLowerCase().includes(q);
        if (!matchesName && !matchesRoad && !matchesId) return false;
      }
      return true;
    });
  }, [projects, filterDept, filterStatus, conflictsOnly, searchQuery, conflictMap]);

  // Grouped projects
  const groupedData = useMemo(() => {
    if (groupBy === "none") {
      return [{ groupName: "All Municipal Works", items: filteredProjects }];
    }
    if (groupBy === "department") {
      const groups: Record<string, Project[]> = {};
      filteredProjects.forEach((p) => {
        if (!groups[p.department]) groups[p.department] = [];
        groups[p.department].push(p);
      });
      return Object.entries(groups).map(([groupName, items]) => ({ groupName, items }));
    }
    // By corridor
    const corridorGroups: Record<string, Project[]> = {};
    filteredProjects.forEach((p) => {
      if (!corridorGroups[p.road_name]) corridorGroups[p.road_name] = [];
      corridorGroups[p.road_name].push(p);
    });
    return Object.entries(corridorGroups).map(([groupName, items]) => ({ groupName, items }));
  }, [filteredProjects, groupBy]);

  // Helper: calculate start percentage and width percentage for a project bar
  const getBarPosition = (startDateStr: string, endDateStr: string) => {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);

    const startOffset = Math.max(0, Math.round((s.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leftPct = (startOffset / totalDays) * 100;
    const widthPct = Math.min(100 - leftPct, (duration / totalDays) * 100);

    return { leftPct, widthPct, duration };
  };

  // Status badge styling
  const getStatusBorder = (status: string) => {
    if (status === "Planned") return "border-dashed border-2 border-white/80";
    if (status === "Approved") return "border-solid border-2 border-white shadow-sm";
    if (status === "Ongoing") return "border-solid border-2 border-white ring-2 ring-cyan-400 animate-pulse";
    return "border-none opacity-60";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden max-w-7xl mx-auto">
      {/* Top Project Management Header & KPIs */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              Gantt Project Schedule
            </span>
            <span className="text-xs text-slate-400">
              Corridor Timeline &bull; Oct 2026 – Dec 2026
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Municipal Infrastructure Master Schedule
          </h2>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Scheduled Works</div>
            <div className="text-base font-extrabold text-white font-mono">{filteredProjects.length}</div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-red-950/40 border border-red-800/50 text-center">
            <div className="text-[10px] uppercase font-semibold text-red-300 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Clashes
            </div>
            <div className="text-base font-extrabold text-red-400 font-mono">{conflicts.length}</div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-center">
            <div className="text-[10px] uppercase font-semibold text-emerald-300">Avoided Rework</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono">
              ₹{(conflicts.length * 350000).toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Filter & View Controls Bar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search corridor or work..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Group By */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            <span className="text-[11px] font-semibold text-slate-500 px-2">Group:</span>
            <button
              type="button"
              onClick={() => setGroupBy("department")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                groupBy === "department"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Department
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("corridor")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                groupBy === "corridor"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Corridor
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("none")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                groupBy === "none"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Flat List
            </button>
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Departments</option>
            <option value="Roads Department">Roads Dept</option>
            <option value="Water Department">Water Dept</option>
            <option value="Electricity Department">Electricity Dept</option>
            <option value="Telecom Department">Telecom Dept</option>
            <option value="Gas Department">Gas Dept</option>
            <option value="Sewerage Department">Sewerage Dept</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="Approved">Approved</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Conflicts Only Toggle */}
          <button
            type="button"
            onClick={() => setConflictsOnly(!conflictsOnly)}
            className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition text-xs ${
              conflictsOnly
                ? "bg-red-50 text-red-700 border-red-300 shadow-xs"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Show Conflicts Only ({conflicts.length})
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-slate-500" /> Planned
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border-2 border-solid border-slate-800" /> Approved
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 ring-1 ring-cyan-400" /> Ongoing
          </div>
          <div className="flex items-center gap-1 text-red-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Collision Zone
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Layout */}
      <div className="flex-1 flex overflow-hidden min-h-[580px]">
        {/* Left Frozen Column: Work Order Specs */}
        <div className="w-80 sm:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0 z-20 shadow-xs">
          {/* Header */}
          <div className="h-16 px-4 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between font-bold text-xs text-slate-700 uppercase tracking-wider">
            <span>Project & Corridor</span>
            <span>Duration</span>
          </div>

          {/* Project Spec Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {groupedData.map((group) => (
              <div key={group.groupName}>
                {groupBy !== "none" && (
                  <div className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-between uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      {group.groupName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono lowercase">
                      {group.items.length} works
                    </span>
                  </div>
                )}

                {group.items.map((proj) => {
                  const hasConflict = conflictMap.has(proj.id);
                  const dept = DEPT_INFO[proj.department] || DEPT_INFO["Other"];
                  const Icon = dept.icon;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => onSelectProject(proj)}
                      className="h-16 px-4 py-2 hover:bg-blue-50/40 cursor-pointer transition flex items-center justify-between gap-3 text-xs group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: dept.color }}
                          />
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {proj.id}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 truncate">
                            &bull; {proj.department.replace(" Department", "")}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                          {proj.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          <span>{proj.road_name}</span>
                          <span className="text-[9px] text-blue-600 font-medium">({proj.project_type})</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-mono font-bold text-slate-700">
                          {formatDate(proj.start_date).split(" ")[0]} – {formatDate(proj.end_date).split(" ")[0]}
                        </div>
                        {hasConflict && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Collision
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Pane */}
        <div className="flex-1 overflow-x-auto flex flex-col bg-slate-50/50 relative">
          <div className="min-w-[1000px] flex-1 flex flex-col relative">
            {/* Timeline Header */}
            <div className="h-16 border-b border-slate-200 bg-white sticky top-0 z-10 flex flex-col">
              {/* Months Row */}
              <div className="h-8 border-b border-slate-200 flex">
                {monthSegments.map((m) => (
                  <div
                    key={m.name}
                    style={{ width: `${m.widthPct}%` }}
                    className="border-r border-slate-200 px-3 flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50/80"
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal">
                      {m.days} days
                    </span>
                  </div>
                ))}
              </div>

              {/* Days Sub-Row */}
              <div className="h-8 flex text-[10px] text-slate-400 font-mono select-none">
                {dayColumns.map((d, idx) => {
                  const isSimToday =
                    d.getFullYear() === timelineMarker.getFullYear() &&
                    d.getMonth() === timelineMarker.getMonth() &&
                    d.getDate() === timelineMarker.getDate();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <div
                      key={idx}
                      style={{ width: `${100 / totalDays}%` }}
                      className={`border-r border-slate-100 flex items-center justify-center font-semibold ${
                        isSimToday
                          ? "bg-red-50 text-red-700 font-bold border-red-300"
                          : isWeekend
                          ? "bg-slate-100/50 text-slate-400"
                          : "text-slate-500"
                      }`}
                    >
                      {d.getDate() % 5 === 0 || d.getDate() === 1 ? d.getDate() : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical Baseline Today Line */}
            <div
              style={{ left: `${timelineMarkerOffset}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            >
              <div className="sticky top-16 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow -translate-x-1/2 whitespace-nowrap">
                Current Date: 15 Nov
              </div>
            </div>

            {/* Gantt Bars Rows */}
            <div className="flex-1 divide-y divide-slate-100 relative">
              {groupedData.map((group) => (
                <div key={group.groupName}>
                  {groupBy !== "none" && (
                    <div className="h-8 bg-slate-100/60 border-b border-slate-200" />
                  )}

                  {group.items.map((proj) => {
                    const { leftPct, widthPct, duration } = getBarPosition(proj.start_date, proj.end_date);
                    const hasConflict = conflictMap.has(proj.id);
                    const associatedConflicts = conflictMap.get(proj.id) || [];
                    const dept = DEPT_INFO[proj.department] || DEPT_INFO["Other"];
                    const statusBorder = getStatusBorder(proj.status);

                    return (
                      <div key={proj.id} className="h-16 relative flex items-center group hover:bg-blue-50/20">
                        {/* Day Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {dayColumns.map((d, i) => (
                            <div
                              key={i}
                              style={{ width: `${100 / totalDays}%` }}
                              className={`border-r border-slate-100 h-full ${
                                d.getDay() === 0 ? "bg-slate-100/30" : ""
                              }`}
                            />
                          ))}
                        </div>

                        {/* Interactive Project Gantt Bar */}
                        <div
                          style={{
                            left: `${leftPct}%`,
                            width: `${Math.max(2.5, widthPct)}%`,
                            backgroundColor: dept.color,
                          }}
                          onClick={() => onSelectProject(proj)}
                          className={`absolute h-8 rounded-lg shadow-sm cursor-pointer transition-all duration-150 flex items-center justify-between px-2.5 text-white ${statusBorder} hover:scale-[1.01] hover:shadow-md z-10 group/bar`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-[11px] truncate drop-shadow-xs">
                              {proj.name}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded shrink-0">
                            {duration}d
                          </span>

                          {/* Hover Tooltip Card */}
                          <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs w-64 pointer-events-none z-30 space-y-1">
                            <div className="font-bold text-white text-sm">{proj.name}</div>
                            <div className="text-slate-300">{proj.department} &bull; {proj.project_type}</div>
                            <div className="text-slate-400">Road: {proj.road_name}</div>
                            <div className="text-blue-300 font-mono text-[11px]">
                              {formatDate(proj.start_date)} &rarr; {formatDate(proj.end_date)} ({duration} days)
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase pt-1 border-t border-slate-700">
                              Status: {proj.status}
                            </div>
                          </div>
                        </div>

                        {/* Visual Conflict Collision Indicator on Gantt */}
                        {hasConflict && associatedConflicts.length > 0 && (
                          <div
                            style={{
                              left: `${leftPct + widthPct * 0.4}%`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectConflict(associatedConflicts[0]);
                            }}
                            className="absolute -top-1.5 z-20 cursor-pointer bg-red-600 hover:bg-red-700 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-md border border-white flex items-center gap-1 animate-pulse"
                            title="Click to inspect conflict sequence"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>CLASH ({associatedConflicts[0].overlapping_days}d)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Coordination Quick Action Callouts */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold">Priority Coordination Works:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const p = projects.find((x) => x.id === "PRJ-2026-001");
              if (p) onSelectProject(p);
            }}
            className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-[11px] transition flex items-center gap-1"
          >
            <span>Mira Bhayandar Corridor: Roads & Water (Sequenced)</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              const p = projects.find((x) => x.id === "PRJ-2026-003");
              if (p) onSelectProject(p);
            }}
            className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold text-[11px] transition flex items-center gap-1"
          >
            <span>Silver Park Zone: Power & Telecom (Joint Trench)</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              const p = projects.find((x) => x.id === "PRJ-2026-016");
              if (p) onSelectProject(p);
            }}
            className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px] transition flex items-center gap-1"
          >
            <span>Shanti Park Zone: Sewerage & Power (Deep-Trench)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
