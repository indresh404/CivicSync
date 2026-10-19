"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderGit2,
  Map,
  AlertTriangle,
  ShieldCheck,
  History,
  RotateCcw,
  UserCheck,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { SimulatedRole } from "@/lib/types";

export type AdminTab =
  | "overview"
  | "projects"
  | "map"
  | "conflicts"
  | "approvals"
  | "audit";

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  currentRole: SimulatedRole;
  onChangeRole: (role: SimulatedRole) => void;
  activeConflictCount: number;
  onResetDemo: () => void;
}

export default function AdminSidebar({
  currentTab,
  onSelectTab,
  currentRole,
  onChangeRole,
  activeConflictCount,
  onResetDemo,
}: AdminSidebarProps) {
  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "projects",
      label: "Projects",
      icon: <FolderGit2 className="w-4 h-4" />,
    },
    {
      id: "map",
      label: "City Map",
      icon: <Map className="w-4 h-4" />,
    },
    {
      id: "conflicts",
      label: "Conflicts",
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: activeConflictCount,
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: "audit",
      label: "Audit Trail",
      icon: <History className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto">
      {/* Brand & Platform Header */}
      <div>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/40">
              <svg
                className="w-4 h-4 fill-none stroke-current stroke-2"
                viewBox="0 0 24 24"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                CivicSync
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                GovTech Infrastructure Hub
              </span>
            </div>
          </Link>

          <Link
            href="/"
            title="View Public Landing Page"
            className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white text-blue-700"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Simulation & Demo Controls */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
        {/* Environment Badge */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Metropolis Demo Area
          </span>
          <button
            type="button"
            onClick={onResetDemo}
            title="Reset to fresh demo scenario"
            className="text-slate-500 hover:text-blue-400 flex items-center gap-1 text-[10px] transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* Simulated Demo Role Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            Simulated Department Role
          </div>
          <select
            value={currentRole}
            onChange={(e) => onChangeRole(e.target.value as SimulatedRole)}
            className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="City Administrator (Approver)">
              City Administrator (Approver)
            </option>
            <option value="Roads Department">Roads Department</option>
            <option value="Water Department">Water Department</option>
            <option value="Electricity Department">Electricity Department</option>
            <option value="Telecom Department">Telecom Department</option>
            <option value="Gas Department">Gas Department</option>
            <option value="Sewerage Department">Sewerage Department</option>
          </select>
          <span className="text-[9px] text-slate-500 block mt-1 leading-tight">
            * Demonstration switcher. Not a security boundary.
          </span>
        </div>
      </div>
    </aside>
  );
}
