"use client";

import React from "react";
import { Search, Plus, AlertTriangle, Calendar, Menu, Bell } from "lucide-react";
import { SimulatedRole } from "@/lib/types";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenRegisterModal: () => void;
  activeConflictCount: number;
  currentRole: SimulatedRole;
  onToggleMobileSidebar?: () => void;
}

export default function AdminHeader({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  onOpenRegisterModal,
  activeConflictCount,
  currentRole,
  onToggleMobileSidebar,
}: AdminHeaderProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Title & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Global Search & Action Controls */}
      <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
        {/* Global Search Bar */}
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, roads, conflicts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Date context */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDate}</span>
        </div>

        {/* Conflict Alert indicator */}
        {activeConflictCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>{activeConflictCount} Active</span>
          </div>
        )}

        {/* Primary CTA: Register Project */}
        <button
          type="button"
          onClick={onOpenRegisterModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Register Project</span>
        </button>
      </div>
    </header>
  );
}
