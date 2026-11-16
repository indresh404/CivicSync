"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Infrastructure3DCanvas from "@/components/graph/Infrastructure3DCanvas";
import GraphControlPanels from "@/components/graph/GraphControlPanels";
import { buildInfrastructureGraph, GraphNode, MIRA_ROAD_MAIN_ROADS } from "@/lib/graphData";
import { Project, Conflict } from "@/lib/types";
import { fetchProjects, fetchConflicts } from "@/lib/api";
import { Loader2, Compass, AlertTriangle, Network } from "lucide-react";

export default function InfrastructureGraphPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  // Graph state
  const [selectedRoad, setSelectedRoad] = useState<string>("Mira Bhayandar Road");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Filters
  const [filterDepartment, setFilterDepartment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [autoOrbit, setAutoOrbit] = useState<boolean>(true);

  // Fetch real-world data from CivicSync API / Seed Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [projRes, confRes] = await Promise.all([
          fetchProjects(),
          fetchConflicts(),
        ]);
        setProjects(projRes || []);
        setConflicts(confRes || []);
      } catch (err) {
        console.warn("Failed to load CivicSync graph data, utilizing offline cache:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute 3D Infrastructure Network Graph
  const graphData = useMemo(() => {
    return buildInfrastructureGraph(projects, conflicts, selectedRoad);
  }, [projects, conflicts, selectedRoad]);

  const handleHoverNode = useCallback(
    (node: GraphNode | null, mousePos?: { x: number; y: number }) => {
      setHoveredNode(node);
      if (mousePos) {
        setTooltipPos(mousePos);
      } else {
        setTooltipPos(null);
      }
    },
    []
  );

  const handleResetCamera = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Network className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center font-mono space-y-1">
          <h2 className="text-sm font-bold text-white tracking-wider uppercase">
            Initializing 3D Infrastructure Graph
          </h2>
          <p className="text-xs text-slate-500">
            Constructing parabolic Bézier arcs & spatial node coordinates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Pure Three.js 3D WebGL Canvas */}
      <Infrastructure3DCanvas
        graphData={graphData}
        selectedNodeId={selectedNode ? selectedNode.id : null}
        onSelectNode={setSelectedNode}
        hoveredNodeId={hoveredNode ? hoveredNode.id : null}
        onHoverNode={handleHoverNode}
        autoOrbit={autoOrbit}
        filterDepartment={filterDepartment}
        filterStatus={filterStatus}
      />

      {/* 2. Glassmorphic HUD & Control Panels */}
      <GraphControlPanels
        graphData={graphData}
        selectedRoad={selectedRoad}
        onSelectRoad={(road) => {
          setSelectedRoad(road);
          setSelectedNode(null);
        }}
        selectedNode={selectedNode}
        onSelectNode={setSelectedNode}
        filterDepartment={filterDepartment}
        onFilterDepartment={setFilterDepartment}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        autoOrbit={autoOrbit}
        onToggleAutoOrbit={() => setAutoOrbit(!autoOrbit)}
        onResetCamera={handleResetCamera}
      />

      {/* 3. Floating 3D Hover Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          style={{
            position: "fixed",
            left: `${tooltipPos.x + 14}px`,
            top: `${tooltipPos.y + 14}px`,
            pointerEvents: "none",
          }}
          className="z-40 max-w-xs bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-cyan-500/40 shadow-2xl text-[11px] text-white animate-in fade-in duration-100 space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hoveredNode.dept_color }}
            />
            <span className="truncate max-w-[200px]">{hoveredNode.name}</span>
          </div>

          <p className="text-[10px] text-slate-400 font-mono">
            {hoveredNode.type === "ROAD"
              ? "Central Corridor Hub"
              : hoveredNode.type === "CONFLICT"
              ? `⚡ Conflict (${hoveredNode.severity})`
              : hoveredNode.department || hoveredNode.type}
          </p>

          {hoveredNode.road_name && (
            <p className="text-[10px] text-cyan-300 font-mono truncate">
              Corridor: {hoveredNode.road_name}
            </p>
          )}

          <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-800 flex items-center justify-between">
            <span>Click to lock focus</span>
            <span>Connections: {hoveredNode.degree}</span>
          </div>
        </div>
      )}
    </div>
  );
}
