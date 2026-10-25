"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, AlertTriangle, Calendar, Menu, LogOut, UserCheck, Eye } from "lucide-react";
import { DepartmentRole, SimulatedRole } from "@/lib/types";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenRegisterModal: () => void;
  activeConflictCount: number;
  currentRole: DepartmentRole | SimulatedRole;
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
  const router = useRouter();
  const [hasLoggedInUser, setHasLoggedInUser] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasLoggedInUser(!!localStorage.getItem("civicsync_token"));
    }
  }, []);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("civicsync_token");
      localStorage.removeItem("civicsync_user");
    }
    router.push("/login");
  };

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

        {/* Active Role Pill */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="truncate max-w-[150px]">{currentRole}</span>
        </div>

        {/* Conflict Alert indicator */}
        {activeConflictCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>{activeConflictCount} Active</span>
          </div>
        )}

        {/* Citizen Portal Link */}
        <Link
          href="/works"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 text-xs font-semibold transition"
          title="Open Citizen Works Map"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Citizen Portal</span>
        </Link>

        {/* Primary CTA: Register Project */}
        <button
          type="button"
          onClick={onOpenRegisterModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Register Project</span>
        </button>

        {/* Sign In / Sign Out */}
        {hasLoggedInUser ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
