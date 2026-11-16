"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraphNode,
  GraphEdge,
  InfrastructureGraphData,
  MIRA_ROAD_MAIN_ROADS,
} from "@/lib/graphData";
import {
  Network,
  Compass,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Droplets,
  Flame,
  Radio,
  Building2,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface GraphControlPanelsProps {
  graphData: InfrastructureGraphData;
  selectedRoad: string;
  onSelectRoad: (road: string) => void;
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  filterDepartment: string;
  onFilterDepartment: (dept: string) => void;
  filterStatus: string;
  onFilterStatus: (status: string) => void;
  autoOrbit: boolean;
  onToggleAutoOrbit: () => void;
  onResetCamera: () => void;
}

export default function GraphControlPanels({
  graphData,
  selectedRoad,
  onSelectRoad,
  selectedNode,
  onSelectNode,
  filterDepartment,
  onFilterDepartment,
  filterStatus,
  onFilterStatus,
  autoOrbit,
  onToggleAutoOrbit,
  onResetCamera,
}: GraphControlPanelsProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "ROADS" | "DEPTS" | "PROJECTS" | "CONFLICTS" | "UTILITIES">("ALL");

  // Filter nodes for the left-hand search roster
  const filteredRosterNodes = graphData.nodes.filter((node) => {
    if (activeTab === "ROADS" && node.type !== "ROAD") return false;
    if (activeTab === "DEPTS" && node.type !== "DEPARTMENT") return false;
    if (activeTab === "PROJECTS" && node.type !== "PROJECT") return false;
    if (activeTab === "CONFLICTS" && node.type !== "CONFLICT") return false;
    if (activeTab === "UTILITIES" && node.type !== "UTILITY") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        node.name.toLowerCase().includes(q) ||
        (node.department || "").toLowerCase().includes(q) ||
        (node.road_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Find incident connections for the selected node
  const incidentEdges = selectedNode
    ? graphData.edges.filter(
        (e) => e.source_id === selectedNode.id || e.target_id === selectedNode.id
      )
    : [];

  return (
    <>
      {/* 1. Mandatory Persistent Disclaimer Banner (Section 9 Requirement) */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-xs border-b border-cyan-500/30 px-4 py-1 flex items-center justify-between text-[11px] font-mono text-cyan-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-[10px] bg-cyan-950 border border-cyan-700/60 px-1.5 py-0.2 rounded">
            DEMO DATA
          </span>
          <span className="text-slate-300">
            Simulated 3D Infrastructure Network Graph &bull; Not real municipal records.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] text-slate-400">
          <span>Mira-Bhayandar Municipal Corporation (MBMC) Jurisdiction</span>
          <span className="text-emerald-400 font-bold">● System Coordinated</span>
        </div>
      </div>

      {/* 2. Top Command-Center Toolbar */}
      <div className="absolute top-8 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition text-xs font-semibold"
            title="Return to City Map Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Map Dashboard</span>
          </Link>

          <div className="h-5 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Network className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                CivicSync 3D Infrastructure Graph
                <span className="text-[10px] font-mono font-bold text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800">
                  v2.4
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Central Road & Department Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Central Road Focus Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-[10px] uppercase font-mono text-slate-400 hidden md:inline">Focus Corridor:</span>
            <select
              value={selectedRoad}
              onChange={(e) => onSelectRoad(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              {MIRA_ROAD_MAIN_ROADS.map((r) => (
                <option key={r} value={r} className="bg-slate-900 text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => onFilterDepartment(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs"
          >
            <option value="ALL">All Departments (6)</option>
            <option value="Roads Department">Roads Dept</option>
            <option value="Water Department">Water Dept</option>
            <option value="Electricity Department">Electricity Dept</option>
            <option value="Sewerage Department">Sewerage Dept</option>
            <option value="Telecom Department">Telecom Dept</option>
            <option value="Gas Department">Gas Dept</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatus(e.target.value)}
            className="px-2 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-semibold focus:outline-none text-xs hidden lg:block"
          >
            <option value="ALL">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="Approved">Approved</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Auto-Orbit Camera Button */}
          <button
            type="button"
            onClick={onToggleAutoOrbit}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-bold transition text-xs shadow-xs ${
              autoOrbit
                ? "bg-amber-950 border-amber-500 text-amber-300 ring-1 ring-amber-500 animate-pulse"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Toggle Continuous Slow 3D Orbital Camera Rotation"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{autoOrbit ? "Orbit ON" : "Auto-Orbit"}</span>
          </button>

          {/* Reset Camera View */}
          <button
            type="button"
            onClick={onResetCamera}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Reset Panoramic Camera Angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Left Panel — Roster of Nodes & Search Filter */}
      <div
        className={`absolute top-24 left-4 z-20 w-80 max-h-[calc(100vh-140px)] bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-xs text-white transition-all duration-300 pointer-events-auto ${
          leftPanelOpen ? "translate-x-0" : "-translate-x-[calc(100%+20px)]"
        }`}
      >
        {/* Left Panel Header */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-xs uppercase tracking-wide">
              Infrastructure Roster ({filteredRosterNodes.length})
            </span>
          </div>
          <button
            onClick={() => setLeftPanelOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Collapse Panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roads, projects, conflicts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 p-2 border-b border-slate-800/80 overflow-x-auto text-[10px]">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-2 py-0.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === "ALL" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("CONFLICTS")}
            className={`px-2 py-0.5 rounded-lg font-semibold transition shrink-0 flex items-center gap-1 ${
              activeTab === "CONFLICTS" ? "bg-red-600 text-white" : "bg-slate-800 text-red-400"
            }`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            Conflicts ({graphData.stats.conflictNodesCount})
          </button>
          <button
            onClick={() => setActiveTab("PROJECTS")}
            className={`px-2 py-0.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === "PROJECTS" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Projects ({graphData.stats.projectNodesCount})
          </button>
          <button
            onClick={() => setActiveTab("DEPTS")}
            className={`px-2 py-0.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === "DEPTS" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Depts (6)
          </button>
          <button
            onClick={() => setActiveTab("UTILITIES")}
            className={`px-2 py-0.5 rounded-lg font-semibold transition shrink-0 ${
              activeTab === "UTILITIES" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
            }`}
          >
            Utilities ({graphData.stats.utilityNodesCount})
          </button>
        </div>

        {/* Node Roster List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[480px]">
          {filteredRosterNodes.length === 0 ? (
            <p className="text-slate-500 italic p-3 text-center">No matching nodes found</p>
          ) : (
            filteredRosterNodes.map((n) => {
              const isSelected = selectedNode?.id === n.id;
              return (
                <div
                  key={n.id}
                  onClick={() => onSelectNode(isSelected ? null : n)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-950"
                      : "bg-slate-950/50 hover:bg-slate-800/80 border-slate-800/80 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: n.dept_color }}
                    />
                    <div className="truncate">
                      <span className="font-bold block truncate">{n.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {n.type === "ROAD"
                          ? "Central Corridor Hub"
                          : n.type === "CONFLICT"
                          ? `⚡ Spatial Conflict (${n.severity})`
                          : n.department || n.type}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                      n.type === "CONFLICT"
                        ? "bg-red-950 text-red-300 border border-red-800"
                        : n.type === "ROAD"
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {n.type}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Collapse/Expand Toggle Button for Left Panel */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          className="absolute top-24 left-4 z-20 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 hover:text-white shadow-xl transition"
          title="Open Infrastructure Roster"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* 4. Right Panel — Selected Node Detailed Technical Inspector */}
      {selectedNode && (
        <div className="absolute top-24 right-4 z-20 w-88 sm:w-96 max-h-[calc(100vh-140px)] bg-slate-900/95 backdrop-blur-md rounded-2xl border border-cyan-500/50 shadow-2xl flex flex-col overflow-hidden text-xs text-white animate-in fade-in slide-in-from-right-4 pointer-events-auto">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedNode.dept_color }}
              />
              <span className="font-bold text-white text-xs uppercase tracking-wide truncate">
                {selectedNode.type} &bull; {selectedNode.department || selectedNode.name}
              </span>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Close Details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <div>
              <h2 className="text-sm font-extrabold text-white leading-tight">
                {selectedNode.name}
              </h2>
              {selectedNode.road_name && (
                <p className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedNode.road_name} ({selectedNode.road_type || "Arterial"})
                </p>
              )}
            </div>

            {/* Type-Specific Inspection Metrics */}
            {selectedNode.type === "CONFLICT" && (
              <div className="space-y-2 p-3 rounded-xl bg-red-950/40 border border-red-800/80 text-[11px]">
                <div className="flex items-center justify-between font-bold text-red-300">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    Severity: {selectedNode.severity}
                  </span>
                  <span className="font-mono bg-red-900/60 px-2 py-0.5 rounded text-white text-[10px]">
                    Clash Separation: {selectedNode.metadata.calculated_distance}m
                  </span>
                </div>
                <p className="text-slate-300 text-[10px] leading-relaxed">
                  {selectedNode.metadata.conflict_reason ||
                    "Spatial and temporal collision between concurrent underground & surface excavations."}
                </p>
                {selectedNode.metadata.suggested_sequence && (
                  <div className="p-2 rounded-lg bg-slate-950 border border-red-900/60 text-amber-300 text-[10px]">
                    <span className="font-bold block uppercase text-[9px] text-amber-400 font-mono">
                      Deterministic Sequencing Rule:
                    </span>
                    {selectedNode.metadata.suggested_sequence}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 pt-1 border-t border-red-900/40">
                  <span>Municipal Rework Avoidance:</span>
                  <strong className="text-emerald-300 font-extrabold">₹3,50,000 INR</strong>
                </div>
              </div>
            )}

            {selectedNode.type === "PROJECT" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Start Date</span>
                    <span className="font-semibold text-cyan-300">{selectedNode.start_date}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">End Date</span>
                    <span className="font-semibold text-cyan-300">{selectedNode.end_date}</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Lifecycle Status:</span>
                  <span className="font-bold text-white px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                    {selectedNode.status}
                  </span>
                </div>
              </div>
            )}

            {selectedNode.type === "UTILITY" && (
              <div className="space-y-2 text-[11px] font-mono p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Excavation Depth:</span>
                  <span className="font-bold text-cyan-300">▼ -{selectedNode.metadata.depth_m}m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Material Grade:</span>
                  <span className="text-slate-200">{selectedNode.metadata.material}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Installed Date:</span>
                  <span className="text-slate-300">{selectedNode.metadata.installed_on}</span>
                </div>
              </div>
            )}

            {/* Incident Connections List */}
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1.5">
                Connected 3D Arcs ({incidentEdges.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {incidentEdges.map((e) => {
                  const otherName = e.source_id === selectedNode.id ? e.target_name : e.source_name;
                  return (
                    <div
                      key={e.id}
                      className={`p-2 rounded-xl border text-[11px] ${
                        e.type === "PROJECT_TO_CONFLICT"
                          ? "bg-red-950/40 border-red-800/70 text-red-200"
                          : "bg-slate-950 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="truncate max-w-[210px]">{otherName}</span>
                        <span className="font-mono text-[10px] text-cyan-400">
                          {Math.round(e.distance3D)}m
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                        Type: {e.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
            <button
              onClick={() => onSelectNode(null)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition text-xs border border-slate-700 text-center"
            >
              Clear Focus
            </button>
          </div>
        </div>
      )}

      {/* 5. Bottom Telemetry & Visual Encoding Legend Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-white">
        {/* Real-Time Metrics */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-400">Total Graph Nodes:</span>
            <strong className="text-white">{graphData.stats.totalNodes}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">3D Curved Tubes:</span>
            <strong className="text-cyan-300">{graphData.stats.totalEdges} Arcs</strong>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>Active Conflicts:</span>
            <strong className="text-red-300">{graphData.stats.activeConflicts} Clashes</strong>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
            <span>Rework Prevented:</span>
            <strong className="text-emerald-300">
              ₹{(graphData.stats.reworkSavingsINR / 100000).toFixed(1)}L INR
            </strong>
          </div>
        </div>

        {/* Visual Encoding Legend */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-300">
          <span className="text-slate-500 font-mono text-[10px] uppercase font-bold">Node Types:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-cyan-400 border border-white" />
            <span>Central Road</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Department Hub</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Project Scope</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-bold">Conflict Hub</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rotate-45 bg-emerald-400" />
            <span>Subsurface Utility</span>
          </div>
        </div>
      </div>
    </>
  );
}
