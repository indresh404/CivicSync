"use client";

import React, { useState } from "react";
import { Conflict, SimulatedRole } from "@/lib/types";
import { acknowledgeConflict, proposeJointTrench, overrideConflict } from "@/lib/api";
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
  ChevronDown,
  ChevronUp,
  GitMerge,
  Info,
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
  const [submittingJoint, setSubmittingJoint] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const deptA = conflict.project_a_dept || "Department A";
  const deptB = conflict.project_b_dept || "Department B";

  const isAckA = conflict.ack_a ?? false;
  const isAckB = conflict.ack_b ?? false;

  const handleAcknowledge = async () => {
    setSubmittingAck(true);
    try {
      const userDept = currentRole.replace(" (Approver)", "");
      await acknowledgeConflict(
        conflict.id,
        userDept,
        `${userDept} Representative`,
        ackNote.trim() || undefined
      );
      onAcknowledged(conflict.id);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to submit acknowledgment");
    } finally {
      setSubmittingAck(false);
    }
  };

  const handleProposeJoint = async () => {
    setSubmittingJoint(true);
    try {
      await proposeJointTrench(conflict.id, "Proposing consolidated joint trenching protocol");
      onAcknowledged(conflict.id);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to propose joint trenching");
    } finally {
      setSubmittingJoint(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setOverrideError("Mandatory non-empty justification is required (min 5 chars).");
      return;
    }
    setOverrideError(null);
    try {
      await overrideConflict(
        conflict.id,
        overrideReason.trim(),
        "City Administrator (Executive Override)"
      );
      onAcknowledged(conflict.id);
      onClose();
    } catch (err: any) {
      setOverrideError(err.message || "Failed to apply override");
    }
  };

  const breakdown = conflict.severity_breakdown || {
    closeness: 0.6,
    days_overlapping: 0.8,
    road_importance: 1.0,
    formula: "0.45*closeness + 0.35*days_overlapping + 0.20*road_importance",
    weights: { w1_closeness: 0.45, w2_overlap: 0.35, w3_road: 0.20 },
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
                Corridor: {conflict.road_name || "Shared Corridor"} (Resolution: {conflict.resolution || conflict.status})
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
          {/* Two-Person Acknowledgment Tracker */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Inter-Agency Acknowledgment Tracker</span>
              <span className="text-[11px] font-medium text-slate-500 lowercase">
                Approval Gate: Both Required
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isAckA
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{deptA}</div>
                  <div className="text-[11px] opacity-80">
                    {isAckA ? `Done (Acked by ${conflict.ack_a_by || "Rep"})` : "Pending Acknowledgment"}
                  </div>
                </div>
                {isAckA ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
              </div>

              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isAckB
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{deptB}</div>
                  <div className="text-[11px] opacity-80">
                    {isAckB ? `Done (Acked by ${conflict.ack_b_by || "Rep"})` : "Pending Acknowledgment"}
                  </div>
                </div>
                {isAckB ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>
          </div>

          {/* Side-by-Side Conflicting Projects */}
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
            </div>
          </div>

          {/* Mini Gantt Comparison */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300 uppercase tracking-wider">
                Schedule Conflict Timeline (Mini Gantt)
              </span>
              <span className="text-red-400 font-bold">
                {conflict.overlapping_days} Days Clash Window
              </span>
            </div>

            {/* Project A Bar */}
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>{deptA}</span>
                <span>{formatDate(conflict.overlap_start)} – {formatDate(conflict.overlap_end)}</span>
              </div>
              <div className="h-4 w-full bg-slate-800 rounded flex overflow-hidden">
                <div className="h-full bg-blue-500 w-2/3" />
                <div className="h-full bg-red-500 animate-pulse w-1/3 flex items-center justify-center text-[9px] font-bold">
                  OVERLAP
                </div>
              </div>
            </div>

            {/* Project B Bar */}
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>{deptB}</span>
                <span>Concurrent Digging</span>
              </div>
              <div className="h-4 w-full bg-slate-800 rounded flex overflow-hidden">
                <div className="h-full bg-transparent w-1/4" />
                <div className="h-full bg-red-500 animate-pulse w-1/3" />
                <div className="h-full bg-cyan-500 w-5/12" />
              </div>
            </div>
          </div>

          {/* Severity Score Gauge & "Why this score?" Accordion */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Deterministic Severity Score: {conflict.severity_score} / 100
                </span>
                <p className="text-[11px] text-slate-500">
                  Separation: {conflict.calculated_distance}m (≤ {conflict.threshold}m threshold) • Overlap: {conflict.overlapping_days} days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Why this score?</span>
                {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showBreakdown && (
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 text-xs space-y-2 animate-in fade-in duration-100">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Formula: severity = w1*closeness + w2*days_overlapping + w3*road_importance
                </div>
                <div className="grid grid-cols-3 gap-2 text-slate-600 pt-1">
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">w1: Closeness (45%)</span>
                    <strong>{breakdown.closeness ?? 0.6}</strong> (norm 0-1)
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">w2: Days (35%)</span>
                    <strong>{breakdown.days_overlapping ?? 0.8}</strong> (norm 0-1)
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">w3: Road Importance (20%)</span>
                    <strong>{breakdown.road_importance ?? 1.0}</strong> (Arterial)
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Qualitative bands: Low &lt; 0.33, Medium &lt; 0.66, High ≥ 0.66.
                </p>
              </div>
            )}
          </div>

          {/* Suggested Sequence Rule */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Suggested Execution Sequence
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {conflict.suggested_sequence}
            </p>
            {conflict.suggested_dates && (
              <div className="mt-2.5 p-2 bg-white rounded-lg border border-blue-200 text-xs font-medium text-blue-900 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{conflict.suggested_dates}</span>
              </div>
            )}
          </div>

          {/* Actions: Acknowledge & Propose Joint Trenching */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Resolution Actions
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={submittingAck}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {submittingAck ? "Submitting..." : "Acknowledge Suggested Sequence"}
              </button>

              <button
                type="button"
                onClick={handleProposeJoint}
                disabled={submittingJoint}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5" />
                {submittingJoint ? "Proposing..." : "Propose Joint Trenching"}
              </button>
            </div>
          </div>

          {/* Admin Override Section */}
          <div className="pt-2 border-t border-slate-200">
            {!showOverrideForm ? (
              <button
                type="button"
                onClick={() => setShowOverrideForm(true)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Administrative Override (Mandatory Reason Required)
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Mandatory Administrative Override
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOverrideForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
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
                  Confirm & Override Conflict
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Resolution: <strong>{conflict.resolution || conflict.status}</strong>
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
