"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Building2,
  Search,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HardHat,
} from "lucide-react";
import { fetchPublicWorks } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import MapComponent from "@/components/MapComponent";
import { Project } from "@/lib/types";

export default function PublicWorksPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [selectedWork, setSelectedWork] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchPublicWorks();
      setWorks(data);
      if (data.length > 0) setSelectedWork(data[0]);
      setLoading(false);
    }
    load();
  }, []);

  const filteredWorks = works.filter((w) => {
    const matchesSearch =
      w.road_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "ALL" || w.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const adaptedProjects: Project[] = filteredWorks.map((w) => ({
    id: w.id,
    title: w.title,
    name: w.title,
    department: w.department,
    project_type: w.project_type,
    road_name: w.road_name,
    road_type: "Arterial",
    latitude: w.lat,
    longitude: w.lng,
    end_latitude: w.end_lat,
    end_longitude: w.end_lng,
    radius_meters: 25,
    start_date: w.start_date,
    end_date: w.end_date,
    status: w.status,
    conflict_check_performed: true,
    conflict_check_version: 1,
    is_overridden: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
                C
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  CivicSync
                </span>
                <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                  Public Citizen Works Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live City Digest
            </span>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-sm"
            >
              Agency Login →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Intro Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200 uppercase tracking-wider">
              <HardHat className="w-4 h-4 text-blue-300" />
              Official Infrastructure Transparency
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Upcoming & Ongoing Municipal Road Works
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed">
              Explore authorized excavations, resurfacing, water mains, and optical fiber trenching across the municipal grid. All projects shown here have cleared municipal collision checks.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by road name or work type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full sm:w-auto text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">All Departments</option>
              <option value="Roads Department">Roads Department</option>
              <option value="Water Department">Water Department</option>
              <option value="Electricity Department">Electricity Department</option>
              <option value="Sewerage Department">Sewerage Department</option>
              <option value="Telecom Department">Telecom Department</option>
              <option value="Gas Department">Gas Department</option>
            </select>
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              {filteredWorks.length} Active Works
            </span>
          </div>
        </div>

        {/* Map & List Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[500px]">
          {/* Map Section */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[400px] lg:h-auto min-h-[420px]">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Live Spatial Overview (OpenFreeMap Vector Tiles)
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Click pin or card to inspect scope
              </span>
            </div>
            <div className="flex-1 relative">
              <MapComponent
                projects={adaptedProjects}
                conflicts={[]}
                selectedProjectId={selectedWork?.id}
                onSelectProject={(p) => {
                  const found = works.find((w) => w.id === p.id);
                  if (found) setSelectedWork(found);
                }}
              />
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
              Scheduled Civic Work Orders ({filteredWorks.length})
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[600px] pr-1">
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
                      <div className="h-3.5 w-48 bg-slate-200 rounded" />
                      <div className="h-2.5 w-28 bg-slate-100 rounded" />
                      <div className="h-2 w-36 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredWorks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  No municipal works match your filter query.
                </div>
              ) : (
                filteredWorks.map((w) => {
                  const isSelected = selectedWork?.id === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWork(w)}
                      className={`p-4 rounded-xl border cursor-pointer transition text-left ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-600 ring-1 ring-blue-600"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-900 leading-snug">
                          {w.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                            w.status === "Ongoing"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{w.road_name}</span>
                        <span>•</span>
                        <span>{w.department}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(w.start_date)} – {formatDate(w.end_date)}
                        </span>
                        <span className="font-medium text-blue-600">{w.project_type}</span>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-blue-200/60 text-[11px] text-slate-600 space-y-1.5 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-blue-900 font-medium">
                            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Municipal Clearance: Approved
                            </span>
                            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200">
                              ID: {w.id}
                            </span>
                          </div>
                          {w.description && (
                            <p className="text-slate-600 italic bg-white/80 p-2 rounded-lg border border-blue-100">
                              "{w.description}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        <p className="max-w-2xl mx-auto px-4">
          CivicSync Public Portal is maintained in accordance with Municipal Infrastructure Coordination Guidelines. Notice: Dates are subject to weather conditions and emergency utility repairs.
        </p>
      </footer>
    </div>
  );
}
