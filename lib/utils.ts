import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy, HH:mm");
  } catch {
    return dateStr;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "Planned":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Approved":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Ongoing":
      return "bg-cyan-50 text-cyan-800 border-cyan-200";
    case "Completed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getSeverityBadgeClass(severity: string): string {
  switch (severity) {
    case "High":
      return "bg-red-50 text-red-700 border-red-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function getDepartmentColor(department: string): string {
  switch (department) {
    case "Roads Department":
      return "#2563EB"; // Blue
    case "Water Department":
      return "#0284C7"; // Sky
    case "Electricity Department":
      return "#D97706"; // Amber
    case "Sewerage Department":
      return "#7C3AED"; // Purple
    case "Telecom Department":
      return "#059669"; // Emerald
    case "Gas Department":
      return "#DC2626"; // Red
    default:
      return "#475569"; // Slate
  }
}
