"use client";

import React, { useState } from "react";
import { Project, SimulatedRole } from "@/lib/types";
import { createProject } from "@/lib/api";
import LocationPickerMap from "./LocationPickerMap";
import {
  X,
  MapPin,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Loader2,
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

  // Determine default department based on current simulated role
  const defaultDept =
    currentRole === "City Administrator (Approver)"
      ? "Roads Department"
      : (currentRole as string);

  const [name, setName] = useState("");
  const [department, setDepartment] = useState(defaultDept);
  const [projectType, setProjectType] = useState("Resurfacing");
  const [description, setDescription] = useState("");
  const [roadName, setRoadName] = useState("");
  const [roadType, setRoadType] = useState<"Arterial" | "Residential">("Arterial");
  const [latitude, setLatitude] = useState(12.9752);
  const [longitude, setLongitude] = useState(77.6095);
  const [radiusMeters, setRadiusMeters] = useState(25);
  const [startDate, setStartDate] = useState("2026-11-05");
  const [endDate, setEndDate] = useState("2026-11-20");

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage("Project name is required.");
      return;
    }
    if (!roadName.trim()) {
      setErrorMessage("Road / Corridor name is required.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setErrorMessage("End date cannot precede start date.");
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setErrorMessage("Invalid latitude or longitude coordinates.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProject({
        name: name.trim(),
        department,
        project_type: projectType,
        description: description.trim() || undefined,
        road_name: roadName.trim(),
        road_type: roadType,
        latitude,
        longitude,
        radius_meters: radiusMeters,
        start_date: startDate,
        end_date: endDate,
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
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              Register Infrastructure Project
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit planned excavation work for automatic spatial and schedule conflict verification.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Basic Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              1. Project Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MG Road Underground Drainage Expansion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Roads Department">Roads Department</option>
                  <option value="Water Department">Water Department</option>
                  <option value="Electricity Department">Electricity Department</option>
                  <option value="Telecom Department">Telecom Department</option>
                  <option value="Gas Department">Gas Department</option>
                  <option value="Sewerage Department">Sewerage Department</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Type *
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Resurfacing">Resurfacing (Surface)</option>
                  <option value="Pipeline">Pipeline (Underground Utility)</option>
                  <option value="Cabling">Cabling / Power / Fiber (Utility)</option>
                  <option value="Sewerage">Sewerage / Drainage (Utility)</option>
                  <option value="Gas line">Gas Line (Utility)</option>
                  <option value="Other">Other Civil Works</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Briefly describe excavation methodology, trench depth, or contractor notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Geographic Location */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                2. Geographic Location
              </span>
              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                {showLocationPicker ? "Hide Map Picker" : "Open Map Location Picker"}
              </button>
            </h4>

            {showLocationPicker && (
              <div className="mb-4">
                <LocationPickerMap
                  initialLat={latitude}
                  initialLng={longitude}
                  onConfirm={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setShowLocationPicker(false);
                  }}
                  onCancel={() => setShowLocationPicker(false)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Road / Corridor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MG Road or Commercial Street"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Road Classification *
                </label>
                <select
                  value={roadType}
                  onChange={(e) => setRoadType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Arterial">Arterial (High Traffic)</option>
                  <option value="Residential">Residential (Local)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Influence Radius (m)
                </label>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value) || 25)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Schedule */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              3. Proposed Execution Window
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              * Conflicts are verified instantly against all existing Planned and Approved works.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering & Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Register Project
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
