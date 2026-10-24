"use client";

import React, { useState, useEffect } from "react";
import { Project, SimulatedRole, PreviewConflictResponse } from "@/lib/types";
import { createProject, previewConflicts } from "@/lib/api";
import LocationPickerMap from "./LocationPickerMap";
import {
  X,
  MapPin,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  CloudRain,
  Flame,
  Info,
} from "lucide-react";

interface RegisterProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProject: Project) => void;
  currentRole: SimulatedRole;
}

export default function RegisterProjectModal({
  isOpen,
  onClose,
  onSuccess,
  currentRole,
}: RegisterProjectModalProps) {
  if (!isOpen) return null;

  const defaultDept =
    currentRole === "City Administrator (Approver)"
      ? "Roads Department"
      : (currentRole as string);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(defaultDept);
  const [projectType, setProjectType] = useState("Pipeline");
  const [geometryType, setGeometryType] = useState<"point" | "line">("point");
  const [description, setDescription] = useState("");
  const [roadName, setRoadName] = useState("Mira Bhayandar Road");
  const [roadType, setRoadType] = useState<"Arterial" | "Residential">("Arterial");
  const [latitude, setLatitude] = useState(19.2848);
  const [longitude, setLongitude] = useState(72.8665);
  const [endLatitude, setEndLatitude] = useState<number | null>(null);
  const [endLongitude, setEndLongitude] = useState<number | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(25);
  const [startDate, setStartDate] = useState("2026-11-05");
  const [endDate, setEndDate] = useState("2026-11-20");
  const [cooldownJustification, setCooldownJustification] = useState("");

  // Live preview state
  const [previewData, setPreviewData] = useState<PreviewConflictResponse | null>(null);
  const [checkingPreview, setCheckingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Trigger live preview check whenever location or dates change in Step 2 or 3
  useEffect(() => {
    let active = true;
    async function runPreview() {
      if (step < 2) return;
      setCheckingPreview(true);
      try {
        const res = await previewConflicts({
          project_type: projectType,
          geometry_type: geometryType,
          lat: latitude,
          lng: longitude,
          end_lat: endLatitude,
          end_lng: endLongitude,
          radius_m: radiusMeters,
          road_name: roadName,
          road_type: roadType,
          start_date: startDate,
          end_date: endDate,
          department,
        });
        if (active) setPreviewData(res);
      } catch (err) {
        console.warn("Live preview check failed:", err);
      } finally {
        if (active) setCheckingPreview(false);
      }
    }
    const timer = setTimeout(runPreview, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [step, latitude, longitude, endLatitude, endLongitude, radiusMeters, startDate, endDate, roadName, roadType, projectType, geometryType, department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Project title is required.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMessage("End date cannot precede start date.");
      return;
    }

    // If cooldown warning is present and requires justification
    if (previewData?.cooldown_warning?.requires_justification && !cooldownJustification.trim()) {
      setErrorMessage("Mandatory cooldown justification note is required to submit underground work on recently resurfaced road.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProject({
        title: name.trim(),
        name: name.trim(),
        department,
        project_type: projectType,
        geometry_type: geometryType,
        description: description.trim() || undefined,
        road_name: roadName.trim(),
        road_type: roadType,
        lat: latitude,
        lng: longitude,
        latitude,
        longitude,
        end_lat: endLatitude,
        end_lng: endLongitude,
        end_latitude: endLatitude,
        end_longitude: endLongitude,
        radius_m: radiusMeters,
        radius_meters: radiusMeters,
        start_date: startDate,
        end_date: endDate,
        cooldown_justification: cooldownJustification.trim() || undefined,
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to register project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Step Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                Step {step} of 3
              </span>
              <span className="text-xs text-slate-500">
                {step === 1 && "Project Details"}
                {step === 2 && "Draw Scope & Live Conflict Preview"}
                {step === 3 && "Municipal Validation & Submission"}
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Register New Municipal Work Order
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Title / Work Scope *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mira Bhayandar Road 600mm Potable Water Trunk Main"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Roads Department">Roads Department</option>
                    <option value="Water Department">Water Department</option>
                    <option value="Electricity Department">Electricity Department</option>
                    <option value="Sewerage Department">Sewerage Department</option>
                    <option value="Telecom Department">Telecom Department</option>
                    <option value="Gas Department">Gas Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Category
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Pipeline">Pipeline (Underground)</option>
                    <option value="Cabling">Cabling (Underground)</option>
                    <option value="Sewerage">Sewerage (Underground)</option>
                    <option value="Gas line">Gas line (Underground)</option>
                    <option value="Resurfacing">Resurfacing (Surface)</option>
                    <option value="Other">Other / Structural</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Road / Corridor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mira Bhayandar Road"
                    value={roadName}
                    onChange={(e) => setRoadName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Road Classification
                  </label>
                  <select
                    value={roadType}
                    onChange={(e) => setRoadType(e.target.value as "Arterial" | "Residential")}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Arterial">Arterial (Major Transit Corridor)</option>
                    <option value="Residential">Residential (Local Lane)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Engineering Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Details regarding trench depth, traffic diversion, or contractor..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Location & Live Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Geometry Type:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGeometryType("point")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                      geometryType === "point"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Point + Radius
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeometryType("line")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                      geometryType === "line"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Line Segment
                  </button>
                </div>
              </div>

              {/* Location Picker Map */}
              <div className="rounded-xl border border-slate-200 overflow-hidden h-72 relative">
                <LocationPickerMap
                  lat={latitude}
                  lng={longitude}
                  endLat={endLatitude}
                  endLng={endLongitude}
                  geometryType={geometryType}
                  radiusMeters={radiusMeters}
                  onLocationChange={(newLat, newLng) => {
                    setLatitude(newLat);
                    setLongitude(newLng);
                  }}
                  onEndLocationChange={(newEndLat, newEndLng) => {
                    setEndLatitude(newEndLat);
                    setEndLongitude(newEndLng);
                  }}
                  onRoadSnapped={(snappedRoadName) => {
                    setRoadName(snappedRoadName);
                  }}
                />
              </div>

              {/* Snapped Road Info Feedback */}
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs flex items-center justify-between text-blue-900">
                <span className="font-medium">
                  Snapped Corridor: <strong className="text-blue-950">{roadName}</strong>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </span>
              </div>

              {/* Radius slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Excavation Buffer Radius:</span>
                  <span className="font-bold text-blue-600">{radiusMeters} meters</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* LIVE PREVIEW BANNER */}
              <div className="rounded-xl border p-3.5 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Live Collision Detection Preview
                  </span>
                  {checkingPreview && (
                    <span className="text-[11px] text-slate-400 font-normal flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                    </span>
                  )}
                </div>

                {previewData?.has_conflicts ? (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-800 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      Possible conflict detected with {previewData.conflicts[0].existing_department} ({previewData.conflicts[0].existing_project_type})
                    </div>
                    <p className="text-[11px] text-red-700">
                      Separation: <strong>{previewData.conflicts[0].distance_meters} m away</strong> • Overlap: <strong>{previewData.conflicts[0].overlapping_days} days concurrent</strong>.
                    </p>
                    <p className="text-[11px] text-slate-600 italic">
                      Recommendation: {previewData.conflicts[0].suggested_sequence}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>No immediate spatial conflicts detected in this drawing area.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Review, Warnings & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Cooldown Warning (Rule 4) */}
              {previewData?.cooldown_warning && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Dig Cooldown Policy Warning
                  </div>
                  <p className="text-xs text-amber-800">
                    Road was resurfaced {previewData.cooldown_warning.months_ago} months ago (Municipal Cooldown is 24 months). Underground utility digging requires formal administrative justification.
                  </p>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Justification Note (Mandatory):
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Explain urgent necessity (e.g. Critical potable pipe burst or safety emergency)"
                      value={cooldownJustification}
                      onChange={(e) => setCooldownJustification(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Monsoon Warning (Rule 5) */}
              {previewData?.monsoon_warning && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800">
                  <CloudRain className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-blue-900">Monsoon Window Advisory (Non-Blocking)</div>
                    <div className="text-[11px] text-blue-700 mt-0.5">
                      Dates fall in the monsoon window (01 June – 30 September). Enhanced flood prevention and trench shoring measures are advised.
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Submission Summary
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><strong>Title:</strong> {name}</div>
                  <div><strong>Department:</strong> {department}</div>
                  <div><strong>Category:</strong> {projectType}</div>
                  <div><strong>Corridor:</strong> {roadName} ({roadType})</div>
                  <div><strong>Duration:</strong> {startDate} to {endDate}</div>
                  <div><strong>Coordinates:</strong> {latitude.toFixed(4)}, {longitude.toFixed(4)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={!name.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering & Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Submit Work Order
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
