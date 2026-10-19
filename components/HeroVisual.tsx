"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MapPin,
  Layers,
  Sparkles,
} from "lucide-react";

export default function HeroVisual() {
  const [activeTab, setActiveTab] = useState<"conflict" | "sequence">("conflict");

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      {/* Visual Window Header */}
      <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          </div>
          <span className="text-xs font-semibold text-slate-600 pl-2">
            CivicSync Active Corridor Conflict Engine — MG Road Corridor
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveTab("conflict")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "conflict"
                ? "bg-red-50 text-red-700 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Detected Conflict (22m)
          </button>
          <button
            onClick={() => setActiveTab("sequence")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "sequence"
                ? "bg-blue-50 text-blue-700 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Recommended Sequence
          </button>
        </div>
      </div>

      {/* Schematic Map & Coordination Workspace */}
      <div className="relative bg-slate-950 p-6 sm:p-8 text-white min-h-[420px] flex flex-col justify-between overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(#60A5FA 1px, transparent 1px), radial-gradient(#60A5FA 1px, #020617 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
          }}
        />

        {/* Schematic Roadways */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Arterial Corridor: MG Road */}
          <div className="w-[120%] h-14 bg-slate-800/90 border-y-2 border-slate-700/80 -rotate-6 relative flex items-center justify-around">
            <div className="absolute inset-x-0 h-0.5 border-t border-dashed border-slate-500/60" />
            <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase select-none">
              MG ROAD [ARTERIAL CORRIDOR]
            </span>
          </div>
          {/* Cross Street: Brigade Avenue */}
          <div className="h-[120%] w-10 bg-slate-800/80 border-x border-slate-700/60 rotate-45 absolute" />
        </div>

        {/* Top Overlay Legend & Status */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
              Active Dual-Excavation Risk Prevented
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 bg-slate-900/90 px-3 py-1 rounded-md border border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Roads Dept (Resurfacing)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Water Dept (Pipeline)
            </span>
          </div>
        </div>

        {/* Interactive Schematic Project Pins */}
        <div className="relative z-10 my-8 flex items-center justify-center">
          <div className="relative w-full max-w-lg h-36 flex items-center justify-between px-6">
            {/* Project A Pin: Roads Resurfacing */}
            <div className="relative group">
              <div className="w-11 h-11 rounded-xl bg-blue-600 border-2 border-white flex items-center justify-center shadow-lg shadow-blue-500/40">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 shadow-xl text-left">
                <div className="flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                  <span>PRJ-2026-001</span>
                  <span className="text-slate-400">Planned</span>
                </div>
                <div className="text-xs font-bold text-white mt-0.5">Roads Resurfacing</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> 05 Nov – 20 Nov
                </div>
              </div>
            </div>

            {/* Conflict Proximity Span Line */}
            <div className="flex-1 mx-4 flex flex-col items-center justify-center">
              <div className="w-full flex items-center">
                <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-red-500 to-sky-400 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    Δ 22.4 METERS (Overlap: 11 Days)
                  </span>
                </div>
              </div>
            </div>

            {/* Project B Pin: Water Trunk Pipeline */}
            <div className="relative group">
              <div className="w-11 h-11 rounded-xl bg-sky-500 border-2 border-white flex items-center justify-center shadow-lg shadow-sky-500/40">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 shadow-xl text-left">
                <div className="flex items-center justify-between text-[11px] text-sky-400 font-semibold">
                  <span>PRJ-2026-002</span>
                  <span className="text-slate-400">Planned</span>
                </div>
                <div className="text-xs font-bold text-white mt-0.5">Water Trunk Line</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> 10 Nov – 25 Nov
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Context Panel based on Active Tab */}
        <div className="relative z-10">
          {activeTab === "conflict" ? (
            <div className="bg-slate-900/95 border border-red-500/40 rounded-xl p-3.5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-red-200">
                      High Severity Conflict Detected (Score: 79.8 / 100)
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                      MG Road Arterial
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Water Dept trunk line excavation is scheduled during Roads Dept resurfacing. Without coordination, newly paved road would be excavated within days.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("sequence")}
                className="shrink-0 self-end sm:self-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition shadow"
              >
                Inspect Sequencing Rule
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/95 border border-blue-500/40 rounded-xl p-3.5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-blue-200">
                      Deterministic Precedence Rule: Underground First
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      Zero Rework Sequence
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Phase 1 (10–25 Nov): Water Dept completes trunk pipe & backfilling. Phase 2 (27 Nov–12 Dec): Roads Dept completes asphalt resurfacing once.
                  </p>
                </div>
              </div>
              <span className="shrink-0 self-end sm:self-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-900/80 border border-emerald-600 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Est. Avoided Rework: $45,000
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
