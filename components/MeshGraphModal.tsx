"use client";

import React, { useState, useMemo } from "react";
import { MeshGraph, MeshNode, MeshLink } from "@/lib/meshNetwork";
import {
  X,
  Network,
  AlertTriangle,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Maximize2,
  Minimize2,
  Compass,
  Filter,
} from "lucide-react";

interface MeshGraphModalProps {
  graph: MeshGraph;
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: MeshNode) => void;
}

export default function MeshGraphModal({
  graph,
  isOpen,
  onClose,
  onSelectNode,
}: MeshGraphModalProps) {
  const [filterType, setFilterType] = useState<"ALL" | "CONFLICT" | "CORRIDOR" | "JOINT_TRENCH">("ALL");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter links
  const filteredLinks = useMemo(() => {
    if (filterType === "ALL") return graph.links;
    return graph.links.filter((l) => l.type === filterType);
  }, [graph.links, filterType]);

  // Compute 2D Canvas positions based on geographic coordinates
  const bounds = useMemo(() => {
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    graph.nodes.forEach((n) => {
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
    });
    return { minLng, maxLng, minLat, maxLat };
  }, [graph.nodes]);

  const SVG_WIDTH = 920;
  const SVG_HEIGHT = 540;
  const PADDING = 60;

  const nodePositions = useMemo(() => {
    const posMap = new Map<string, { x: number; y: number }>();
    const dLng = bounds.maxLng - bounds.minLng || 0.001;
    const dLat = bounds.maxLat - bounds.minLat || 0.001;

    graph.nodes.forEach((node) => {
      const x = PADDING + ((node.lng - bounds.minLng) / dLng) * (SVG_WIDTH - 2 * PADDING);
      // Invert Y so North is at the top
      const y = SVG_HEIGHT - (PADDING + ((node.lat - bounds.minLat) / dLat) * (SVG_HEIGHT - 2 * PADDING));
      posMap.set(node.id, { x, y });
    });
    return posMap;
  }, [graph.nodes, bounds]);

  const activeFocusId = selectedNodeId || hoveredNodeId;
  const selectedNode = graph.nodes.find((n) => n.id === activeFocusId);

  // Find connected links for the selected node
  const activeIncidentLinks = useMemo(() => {
    if (!activeFocusId) return [];
    return graph.links.filter(
      (l) => l.source_id === activeFocusId || l.target_id === activeFocusId
    );
  }, [graph.links, activeFocusId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 ring-1 ring-cyan-500/20">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Network className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Urban Construction Coordination Mesh Topology
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  3D Digital Twin Graph
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Node-to-node multi-department dependency matrix, conflict friction arcs & joint trench channels across Mira Road
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Chips */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  filterType === "ALL"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Links ({graph.links.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CONFLICT")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === "CONFLICT"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-red-400 hover:text-red-300"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Conflicts ({graph.stats.conflict_links})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("CORRIDOR")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === "CORRIDOR"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-cyan-400 hover:text-cyan-300"
                }`}
              >
                <Layers className="w-3 h-3" />
                Corridors ({graph.stats.corridor_links})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("JOINT_TRENCH")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                  filterType === "JOINT_TRENCH"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-400 hover:text-emerald-300"
                }`}
              >
                <Zap className="w-3 h-3" />
                Joint Trench ({graph.stats.joint_trench_links})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700 transition"
              title="Close Topology View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-400">Coordinated Nodes:</span>
            <span className="font-bold text-white">{graph.stats.total_nodes} Sites</span>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-red-400">⚡ Conflict Arcs:</span>
            <span className="font-bold text-red-300">{graph.stats.conflict_links} Clashes</span>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-emerald-400">🔧 Joint Trench Opps:</span>
            <span className="font-bold text-emerald-300">{graph.stats.joint_trench_links} Channels</span>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-cyan-400">🛣️ Arterial Trunks:</span>
            <span className="font-bold text-cyan-300">{graph.stats.corridor_links} Coordinated</span>
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40">
            <span className="text-emerald-300 font-bold">₹ Rework Avoided:</span>
            <span className="font-bold text-emerald-400">₹{(graph.stats.total_savings_inr / 100000).toFixed(1)}L INR</span>
          </div>
        </div>

        {/* Main Content Area: SVG Graph Canvas + Node Inspector Sidebar */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Interactive SVG Canvas */}
          <div className="flex-1 h-full min-h-[420px] bg-slate-950 relative overflow-hidden flex items-center justify-center p-2">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-full max-h-[580px] select-none"
            >
              <defs>
                {/* Radial Glow Filters */}
                <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Animated dash style */}
                <style>{`
                  @keyframes flowPulse {
                    from { stroke-dashoffset: 24; }
                    to { stroke-dashoffset: 0; }
                  }
                  .animated-link {
                    animation: flowPulse 1.2s linear infinite;
                  }
                `}</style>
              </defs>

              {/* Grid Background Lines for Aesthetic Command Center feel */}
              <g stroke="rgba(51, 65, 85, 0.2)" strokeWidth="0.8" strokeDasharray="3, 3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <line key={`gx-${i}`} x1={(i + 1) * 100} y1="0" x2={(i + 1) * 100} y2={SVG_HEIGHT} />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <line key={`gy-${i}`} x1="0" y1={(i + 1) * 80} x2={SVG_WIDTH} y2={(i + 1) * 80} />
                ))}
              </g>

              {/* 1. Render Links */}
              <g className="links-layer">
                {filteredLinks.map((link) => {
                  const sPos = nodePositions.get(link.source_id);
                  const tPos = nodePositions.get(link.target_id);
                  if (!sPos || !tPos) return null;

                  const isIncident =
                    activeFocusId &&
                    (link.source_id === activeFocusId || link.target_id === activeFocusId);
                  const isHovered = hoveredLinkId === link.id;

                  // Curved quadratic bezier arc
                  const midX = (sPos.x + tPos.x) / 2;
                  const midY = (sPos.y + tPos.y) / 2;
                  const dx = tPos.x - sPos.x;
                  const dy = tPos.y - sPos.y;
                  const curvature = link.type === "CONFLICT" ? -35 : link.type === "JOINT_TRENCH" ? 25 : 15;
                  const ctrlX = midX - (dy / Math.sqrt(dx * dx + dy * dy || 1)) * curvature;
                  const ctrlY = midY + (dx / Math.sqrt(dx * dx + dy * dy || 1)) * curvature;
                  const pathData = `M ${sPos.x} ${sPos.y} Q ${ctrlX} ${ctrlY} ${tPos.x} ${tPos.y}`;

                  let strokeColor = link.color;
                  let strokeWidth = isHovered || isIncident ? 3.5 : link.type === "CONFLICT" ? 2.5 : 1.8;
                  let opacity = activeFocusId ? (isIncident ? 1.0 : 0.15) : 0.75;

                  return (
                    <g key={link.id} className="cursor-pointer" onMouseEnter={() => setHoveredLinkId(link.id)} onMouseLeave={() => setHoveredLinkId(null)}>
                      {/* Glow path */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={link.glow_color}
                        strokeWidth={strokeWidth + 5}
                        strokeOpacity={opacity * 0.4}
                        filter={link.type === "CONFLICT" ? "url(#glow-red)" : "url(#glow-cyan)"}
                      />
                      {/* Core animated vector beam */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={opacity}
                        strokeDasharray={link.type === "CONFLICT" ? "6, 3" : link.type === "JOINT_TRENCH" ? "4, 2" : "none"}
                        className={link.type === "CONFLICT" || isIncident ? "animated-link" : ""}
                      />
                    </g>
                  );
                })}
              </g>

              {/* 2. Render Nodes */}
              <g className="nodes-layer">
                {graph.nodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const isSelected = selectedNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isNeighbor =
                    activeFocusId &&
                    graph.links.some(
                      (l) =>
                        (l.source_id === activeFocusId && l.target_id === node.id) ||
                        (l.target_id === activeFocusId && l.source_id === node.id)
                    );
                  const isFaded = activeFocusId && !isSelected && !isHovered && !isNeighbor;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer transition-transform duration-200"
                      onClick={() => {
                        setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      opacity={isFaded ? 0.25 : 1.0}
                    >
                      {/* Outer pulsing beacon ring for conflicting or active nodes */}
                      {(node.has_conflict || isSelected || isHovered) && (
                        <circle
                          r="18"
                          fill="none"
                          stroke={node.has_conflict ? "#ef4444" : node.dept_color}
                          strokeWidth="1.5"
                          strokeDasharray="3, 3"
                          opacity="0.75"
                          className="animate-spin"
                          style={{ animationDuration: "6s" }}
                        />
                      )}

                      {/* Halo ring */}
                      <circle
                        r={isSelected || isHovered ? 13 : 9}
                        fill={node.dept_color}
                        fillOpacity="0.25"
                      />

                      {/* Center Core Circle */}
                      <circle
                        r={isSelected || isHovered ? 8 : 6}
                        fill={node.dept_color}
                        stroke="#ffffff"
                        strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                      />

                      {/* Text Label */}
                      <text
                        x="0"
                        y={isSelected || isHovered ? 22 : 16}
                        textAnchor="middle"
                        fill={isSelected || isHovered ? "#38bdf8" : "#cbd5e1"}
                        fontSize={isSelected || isHovered ? 11 : 9}
                        fontWeight={isSelected || isHovered ? "700" : "500"}
                        fontFamily="system-ui, sans-serif"
                        className="pointer-events-none drop-shadow"
                      >
                        {node.name.length > 22 ? `${node.name.slice(0, 20)}...` : node.name}
                      </text>

                      {/* Degree Badge */}
                      {node.degree > 0 && (
                        <g transform="translate(10, -10)">
                          <circle r="6" fill="#0f172a" stroke={node.dept_color} strokeWidth="1" />
                          <text
                            x="0"
                            y="2.5"
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="7"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {node.degree}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Canvas Legend */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1.5 shadow-lg">
              <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">Mesh Link Taxonomy</span>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-0.5 bg-red-500 rounded-full" />
                <span>Critical Conflict Friction Arc</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-0.5 bg-cyan-400 rounded-full" />
                <span>Arterial Corridor Backbone Trunk</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-0.5 bg-emerald-400 rounded-full" />
                <span>Joint Trenching Candidate Channel</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-0.5 bg-indigo-400 rounded-full" />
                <span>Inter-District Proximity Web</span>
              </div>
            </div>
          </div>

          {/* Node Inspector Sidebar */}
          <div className="w-full lg:w-96 p-4 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between overflow-y-auto text-xs space-y-4">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedNode.dept_color }}
                    />
                    <span className="font-bold text-white uppercase text-[11px] tracking-wider">
                      {selectedNode.department}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedNode.has_conflict
                        ? "bg-red-950 text-red-300 border border-red-700"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                    }`}
                  >
                    {selectedNode.has_conflict ? "Active Conflict" : "Synchronized"}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm leading-tight">
                    {selectedNode.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedNode.road_name} ({selectedNode.road_type})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Start Window</span>
                    <span className="font-semibold text-cyan-300">{selectedNode.start_date}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">End Window</span>
                    <span className="font-semibold text-cyan-300">{selectedNode.end_date}</span>
                  </div>
                </div>

                {/* Connected Topology Arcs */}
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1.5">
                    Connected Inter-Site Arcs ({activeIncidentLinks.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {activeIncidentLinks.length === 0 ? (
                      <p className="text-slate-500 italic text-[11px]">No active links</p>
                    ) : (
                      activeIncidentLinks.map((l) => {
                        const partnerId = l.source_id === selectedNode.id ? l.target_id : l.source_id;
                        const partnerName = l.source_id === selectedNode.id ? l.target_name : l.source_name;
                        const partnerDept = l.source_id === selectedNode.id ? l.target_dept : l.source_dept;

                        return (
                          <div
                            key={l.id}
                            className={`p-2 rounded-xl border text-[11px] transition ${
                              l.type === "CONFLICT"
                                ? "bg-red-950/40 border-red-800/70 text-red-200"
                                : l.type === "JOINT_TRENCH"
                                ? "bg-emerald-950/40 border-emerald-800/70 text-emerald-200"
                                : "bg-cyan-950/40 border-cyan-800/70 text-cyan-200"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>{l.label}</span>
                              <span className="font-mono text-[10px]">{l.distance_m}m</span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                              ↔ {partnerName} ({partnerDept})
                            </p>
                            {l.suggested_sequence && (
                              <p className="text-[9px] text-amber-300/90 mt-1 italic leading-tight">
                                ↳ {l.suggested_sequence}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectNode(selectedNode);
                      onClose();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30 text-xs"
                  >
                    <Compass className="w-4 h-4" />
                    Inspect on 3D Map
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-3">
                <Network className="w-10 h-10 text-cyan-500/50 animate-pulse" />
                <div>
                  <h4 className="font-bold text-white text-sm">Select a Mesh Node</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Click any node or connection arc on the topology canvas to inspect multi-agency coordination parameters, clash distances, and sequencing rules.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>CivicSync Mesh v2.4</span>
              <span className="text-emerald-400">96.4% Coordination Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
