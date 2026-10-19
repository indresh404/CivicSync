"use client";

import React, { useState } from "react";
import { Conflict, SimulatedRole } from "@/lib/types";
import { acknowledgeConflict, overrideProject } from "@/lib/api";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  ShieldAlert,
  ArrowRight,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDate, getSeverityBadgeClass } from "@/lib/utils";

interface ConflictDetailModalProps {
  conflict: Conflict | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledged: (conflictId: string) => void;
  currentRole: SimulatedRole;
}

export default function ConflictDetailModal({
  conflict,
  isOpen,
  onClose,
  onAcknowledged,
  currentRole,
}: ConflictDetailModalProps) {
  if (!isOpen || !conflict) return null;

  const [ackNote, setAckNote] = useState("");
  const [submittingAck, setSubmittingAck] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Check which departments have acknowledged
  const ackedDepts = new Set(
    conflict.acknowledgments
      .filter((a) => a.report_version === conflict.report_version)
      .map((a) => a.department)
  );

  const deptA = conflict.project_a_dept || "Department A";
  const deptB = conflict.project_b_dept || "Department B";

  const isCurrentDeptInvolved =
    currentRole === "City Administrator (Approver)" ||
    currentRole === deptA ||
    currentRole === deptB;

  const currentRoleDeptName =
    currentRole === "City Administrator (Approver)" ? deptA : currentRole;

  const hasCurrentDeptAcked = ackedDepts.has(currentRoleDeptName);

  const handleAcknowledge = async () => {
    setSubmittingAck(true);
    try {
      await acknowledgeConflict(conflict.id, {
        department: currentRoleDeptName,
        acknowledged_by: `${currentRoleDeptName} Representative (Simulated)`,
        note: ackNote.trim() || undefined,
      });
      onAcknowledged(conflict.id);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to submit acknowledgment");
    } finally {
      setSubmittingAck(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setOverrideError("Mandatory non-empty justification is required (min 5 chars).");
      return;
    }
    setOverrideError(null);
    try {
      await overrideProject(
        conflict.project_a_id,
        overrideReason.trim(),
        "City Administrator (Simulated Override)"
      );
      onAcknowledged(conflict.id);
      onClose();
    } catch (err: any) {
      setOverrideError(err.message || "Failed to apply override");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getSeverityBadgeClass(
                conflict.severity_level
              )}`}
            >
              {conflict.severity_level} Severity
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                Conflict {conflict.id} Analysis
              </h3>
              <p className="text-xs text-slate-500">
                Corridor: {conflict.road_name || "Shared Corridor"} (Report v{conflict.report_version})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Conflicting Projects Pair Visual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project A */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-700 mb-1">
                <span>{conflict.project_a_id}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {conflict.project_a_dept}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{conflict.project_a_name}</h4>
              <p className="text-xs text-slate-600 mt-1">
                Type: <strong>{conflict.project_a_type}</strong>
              </p>
              <div className="mt-3 pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Acknowledgment:</span>
                {ackedDepts.has(deptA) ? (
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                  </span>
                ) : (
                  <span className="font-semibold text-amber-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending Acknowledgment
                  </span>
                )}
              </div>
            </div>

            {/* Project B */}
            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50">
              <div className="flex items-center justify-between text-xs font-semibold text-sky-700 mb-1">
                <span>{conflict.project_b_id}</span>
                <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                  {conflict.project_b_dept}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{conflict.project_b_name}</h4>
              <p className="text-xs text-slate-600 mt-1">
                Type: <strong>{conflict.project_b_type}</strong>
              </p>
              <div className="mt-3 pt-2 border-t border-sky-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Acknowledgment:</span>
                {ackedDepts.has(deptB) ? (
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                  </span>
                ) : (
                  <span className="font-semibold text-amber-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending Acknowledgment
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Conflict Reason & Calculation Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Deterministic Conflict Detection Breakdown
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Haversine Distance</div>
                <div className="text-base font-bold text-slate-900">
                  {conflict.calculated_distance} m
                </div>
                <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                  ≤ {conflict.threshold}m Threshold
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Schedule Overlap</div>
                <div className="text-base font-bold text-slate-900">
                  {conflict.overlapping_days} Days
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {formatDate(conflict.overlap_start)} – {formatDate(conflict.overlap_end)}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">Severity Calculation</div>
                <div className="text-base font-bold text-slate-900">
                  {conflict.severity_score} / 100
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  45% Prox + 35% Overlap + 20% Road
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
              <strong>Engine Audit Note:</strong> {conflict.conflict_reason}
            </p>
          </div>

          {/* Sequencing Recommendation Engine Rule */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Sequencing Recommendation Rule
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              {conflict.suggested_sequence}
            </p>
            {conflict.suggested_dates && (
              <div className="mt-2.5 p-2 bg-white rounded-lg border border-blue-200 text-xs font-medium text-blue-900 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{conflict.suggested_dates}</span>
              </div>
            )}
          </div>

          {/* Historical Acknowledgments Log */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Department Acknowledgment Trail
            </h4>
            {conflict.acknowledgments.length === 0 ? (
              <div className="text-xs text-slate-500 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                No departmental acknowledgments recorded yet for report version v{conflict.report_version}. Both departments must acknowledge before approval can be granted.
              </div>
            ) : (
              <div className="space-y-2">
                {conflict.acknowledgments.map((ack) => (
                  <div
                    key={ack.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-start justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {ack.department} — {ack.acknowledged_by}
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        {ack.note || "Acknowledged coordination sequence without additional notes."}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      v{ack.report_version}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Acknowledgment Action Box */}
          {isCurrentDeptInvolved && !hasCurrentDeptAcked && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <h4 className="text-xs font-bold text-emerald-900 mb-1">
                Acknowledge as {currentRoleDeptName}
              </h4>
              <p className="text-xs text-emerald-800 mb-2">
                By acknowledging, your department confirms review of the proximity analysis and proposed execution sequence.
              </p>
              <input
                type="text"
                placeholder="Optional coordination note (e.g., 'Agreed to hold excavation until 20 Nov')"
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white mb-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={submittingAck}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Submit Department Acknowledgment
              </button>
            </div>
          )}

          {/* Admin Override Section */}
          {currentRole === "City Administrator (Approver)" && (
            <div className="pt-3 border-t border-slate-200">
              {!showOverrideForm ? (
                <button
                  type="button"
                  onClick={() => setShowOverrideForm(true)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Apply Executive Administrator Override (Bypass Gate)
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      Executive Administrator Override
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOverrideForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-red-800">
                    Mandatory justification reason required. This action will be permanently recorded in the append-only audit trail.
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Enter formal justification (e.g. Critical public safety emergency repair authorization)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-red-300 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {overrideError && (
                    <div className="text-xs font-semibold text-red-700">{overrideError}</div>
                  )}
                  <button
                    type="button"
                    onClick={handleOverride}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition"
                  >
                    Confirm & Log Executive Override
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Conflict status: <strong>{conflict.status}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
