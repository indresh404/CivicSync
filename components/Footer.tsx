import React from "react";
import Link from "next/link";
import { ShieldCheck, Info, AlertTriangle } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                C
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                CivicSync
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              A cross-department road-work coordination platform giving city departments a shared map, pre-approval conflict detection, underground-first sequencing suggestions, and an immutable audit trail.
            </p>

            {/* Known Limitations Callout */}
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                System Principles & Known Limitations
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                <li>Cost-avoided and severity scores use assumed municipal constants (₹350,000 / dig avoided).</li>
                <li>The system depends on timely inter-departmental registration of planned works.</li>
                <li>The sequencing rule is a deterministic fixed domain rule (underground before surface), not an automated solver or optimizer.</li>
              </ul>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/admin" className="hover:text-blue-600 transition">
                  Map View
                </Link>
              </li>
              <li>
                <Link href="/works" className="hover:text-blue-600 transition">
                  Public Citizen Works Map
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-600 transition">
                  Staff Sign In
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-600 transition">
                  How Conflict Detection Works
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Operations Hub
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link
                  href="/admin"
                  className="font-medium text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5"
                >
                  <span>Open Operations Dashboard</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                    Live
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-blue-600 transition">
                  Approval Gates
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-blue-600 transition">
                  Audit Trail
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            &copy; {currentYear} CivicSync. Cross-Department Road-Work Coordination Platform.
          </p>
          <p className="text-slate-400 text-center sm:text-right">
            Deterministic spatial collision detection &bull; Pure Python haversine math &bull; No ML/No solver.
          </p>
        </div>
      </div>
    </footer>
  );
}
