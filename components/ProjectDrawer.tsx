"use client";

import React, { useState } from "react";
import { Project, Conflict, SimulatedRole } from "@/lib/types";
import { approveProject, changeProjectStatus } from "@/lib/api";
import {
  X,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatDate, getStatusBadgeClass, getSeverityBadgeClass } from "@/lib/utils";

interface ProjectDrawerProps {
  project: Project | null;
  conflicts: Conflict[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onSelectConflict: (conflict: Conflict) => void;
  onViewRoadHistory?: (roadName: string) => void;
  currentRole: SimulatedRole;
}

export default function ProjectDrawer({
  project,
  conflicts,
  isOpen,
  onClose,
  onUpdate,
  onSelectConflict,
  onViewRoadHistory,
  currentRole,
}: ProjectDrawerProps) {
  if (!isOpen || !project) return null;

  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const projectConflicts = conflicts.filter(
    (c) => c.project_a_id === project.id || c.project_b_id === project.id
  );

  const hasUnresolvedConflicts = projectConflicts.some(
    (c) => c.status === "Awaiting Acknowledgment" || c.status === "Ready for Review"
  );

  const handleApprove = async () => {
    setApproving(true);
    setApprovalError(null);
    try {
      await approveProject(project.id, `${currentRole} Official (Simulated)`);
      onUpdate();
    } catch (err: any) {
      setApprovalError(err.message || "Approval rejected by workflow gate.");
    } finally {
      setApproving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await changeProjectStatus(
        project.id,
        newStatus,
        `${currentRole} Official (Simulated)`
      );
      onUpdate();
    } catch (err: any) {
      alert(err.message || "Status change failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {project.id}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded border ${getStatusBadgeClass(
                project.status
              )}`}
            >
              {project.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Project Title & Department */}
          <div>
            <h3 className="font-bold text-lg text-slate-900 leading-snug">
              {project.name}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {project.department} &bull; {project.project_type}
            </p>
            {project.description && (
              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {project.description}
              </p>
            )}
          </div>

          {/* Location & Schedule Specs */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500">Corridor / Road:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{project.road_name}</div>
              <span className="text-[10px] text-blue-600 font-medium">({project.road_type})</span>
              {onViewRoadHistory && (
                <button
                  type="button"
                  onClick={() => onViewRoadHistory(project.road_name)}
                  className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 underline underline-offset-2"
                >
                  <Clock className="w-3 h-3" /> View Road History Timeline
                </button>
              )}
            </div>

            <div>
              <span className="text-slate-500">Excavation Radius:</span>
              <div className="font-semibold text-slate-900 mt-0.5">{project.radius_meters} meters</div>
              <span className="text-[10px] text-slate-400">Lat: {project.latitude}, Lng: {project.longitude}</span>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-500">Execution Window:</span>
              <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {formatDate(project.start_date)} – {formatDate(project.end_date)}
              </div>
            </div>
          </div>

          {/* Conflict Analysis Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Associated Conflicts ({projectConflicts.length})
              </h4>
            </div>

            {projectConflicts.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero active spatial or scheduling conflicts detected for this project.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {projectConflicts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => onSelectConflict(c)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 cursor-pointer transition shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-800">{c.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityBadgeClass(
                          c.severity_level
                        )}`}
                      >
                        {c.severity_level} (Score: {c.severity_score})
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 line-clamp-2">
                      {c.conflict_reason}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-blue-600 font-medium">
                      <span>Status: {c.status}</span>
                      <span className="flex items-center gap-1 hover:underline">
                        Review Sequence <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Executive Override Badge if Overridden */}
          {project.is_overridden && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Executive Administrator Override Applied
              </div>
              <p className="text-amber-800 italic">"{project.override_reason}"</p>
              <div className="text-[11px] text-amber-700 mt-2 font-mono">
                Authorized by: {project.override_by}
              </div>
            </div>
          )}

          {/* Approval Gate Status & Actions */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Approval Gate State
            </h4>

            {project.status === "Planned" ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  {hasUnresolvedConflicts
                    ? "Approval is gated. Both involved departments must acknowledge conflict reports before this project can transition to Approved."
                    : "Conflict verification satisfied. Project is eligible for formal municipal approval."}
                </p>

                {approvalError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {approvalError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving || hasUnresolvedConflicts}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Grant Standard Approval
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="text-slate-600">
                  Current lifecycle status: <strong className="text-slate-900">{project.status}</strong>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {project.status === "Approved" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("Ongoing")}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition text-xs"
                    >
                      Start Excavation (Mark Ongoing)
                    </button>
                  )}
                  {project.status === "Ongoing" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange("Completed")}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-semibold transition text-xs"
                    >
                      Complete & Restore Road
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Registered: {formatDate(project.created_at)}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
