import React from "react";
import Link from "next/link";
import { ShieldCheck, Info } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <svg
                  className="w-4 h-4 fill-none stroke-current stroke-2"
                  viewBox="0 0 24 24"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                CivicSync
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              A shared municipal infrastructure coordination platform helping city departments synchronize roadworks, pipelines, cabling, and utilities on one shared map to prevent repeated road excavation.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Demonstration platform. Uses deterministic spatial & schedule rules.
              </span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <a href="#platform" className="hover:text-blue-600 transition">
                  Overview
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-600 transition">
                  Workflow
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-blue-600 transition">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#benefits" className="hover:text-blue-600 transition">
                  Benefits
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Operations
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
                  Shared City Map
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-blue-600 transition">
                  Conflict Resolution Gate
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
            &copy; {currentYear} CivicSync. Smart City Infrastructure Coordination Platform.
          </p>
          <p className="text-slate-400 text-center sm:text-right">
            Designed for municipal corporations, public works departments, and utility authorities.
          </p>
        </div>
      </div>
    </footer>
  );
}
