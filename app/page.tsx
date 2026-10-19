"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroVisual from "@/components/HeroVisual";
import {
  ArrowRight,
  MapPin,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  History,
  BarChart3,
  Search,
  Building2,
  FileCheck2,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* 1. HERO SECTION */}
        <section
          id="platform"
          className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden border-b border-slate-200/60 bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Smart City Infrastructure Coordination
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                One City. One Plan.{" "}
                <span className="text-blue-600">Zero Rework.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Coordinate roadworks, utilities, and public infrastructure on one shared map. Detect scheduling conflicts before approval, sequence projects intelligently, and maintain an auditable record of every municipal decision.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link
                  href="/admin"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2"
                >
                  Explore CivicSync
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:scale-[0.98] transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Live Coordination Engine Visual */}
            <div className="mt-14 md:mt-16">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* 2. PROBLEM SECTION */}
        <section id="problem" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                The Municipal Dilemma
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
                Cities don't have a digging problem. They have a coordination problem.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3">
                When city departments plan in disconnected silos, public roads turn into perpetual construction sites.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Challenge 1 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base mb-4">
                  1
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">
                  Fragmented Planning
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Roads, Water, Electricity, Gas, and Telecom agencies maintain independent project schedules and separate contractor pipelines with zero cross-department visibility.
                </p>
              </div>

              {/* Challenge 2 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-base mb-4">
                  2
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">
                  Repeated Excavation
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A newly resurfaced road is dug open weeks later by a utility department for pipeline repairs, destroying municipal investments and disrupting citizen commutes.
                </p>
              </div>

              {/* Challenge 3 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base mb-4">
                  3
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">
                  Missing Accountability
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  When a freshly paved street is excavated, municipal administrators have no transparent trail to identify who approved the timing, who acknowledged the conflict, or why rework occurred.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS WORKFLOW */}
        <section
          id="how-it-works"
          className="py-20 bg-slate-50/70 border-b border-slate-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Core Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
                Transparent Four-Step Coordination Gate
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                CivicSync replaces informal phone calls and siloed spreadsheets with an automated, explainable approval pipeline.
              </p>
            </div>

            {/* Desktop Horizontal / Mobile Vertical Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {/* Step 1 */}
              <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-sm mb-4">
                    01
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-1.5">Register</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Departments pin planned excavations, road segment coordinates, road classification, and scheduled execution dates.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
                  Shared City GIS
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-sm mb-4">
                    02
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-1.5">Detect</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Deterministic engine calculates Haversine proximity (&le;50m) and calendar overlap, computing a normalized severity score.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-600">
                  Explainable Scoring
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-sm mb-4">
                    03
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-1.5">Coordinate</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    System suggests sequence (e.g. utility works before resurfacing). Both involved departments must formally acknowledge the report.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-indigo-600">
                  Dual Acknowledgment
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-sm mb-4">
                    04
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mb-1.5">Approve & Audit</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Approval unlocks only once conflicts are acknowledged. Administrator overrides require mandatory reasons and are permanently logged.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-600">
                  Append-Only Trail
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PLATFORM CAPABILITIES */}
        <section id="capabilities" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                GovTech Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
                Built for Municipal Operations Scale
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1.5">
                  Shared Interactive City Map
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  MapLibre GL visualization with actual geographic coordinates, colored pins by lifecycle status, and real-time conflict highlights.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1.5">
                  Deterministic Conflict Detection
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rule-based engine calculates Haversine proximity (&le;50m) and inclusive calendar day overlap with transparent 0–100 severity weighting.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1.5">
                  Sequencing Recommendation Engine
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enforces domain rules: underground utility work (pipelines, cables) must precede surface resurfacing to avoid immediate re-digging.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-4">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1.5">
                  Cross-Department Acknowledgments
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Both involved departments must formally review and acknowledge conflict reports before regular approval can be authorized.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1.5">
                  Approval Gates & Logged Overrides
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Projects cannot bypass the gate silently. Executive overrides require non-empty reasons and are recorded in the audit log.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1.5">
                  Auditable Decision History
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Append-only audit trail logs every project creation, conflict check, acknowledgment, override, and status change with actors and timestamps.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. BENEFITS SECTION */}
        <section id="benefits" className="py-20 bg-slate-50/70 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Measurable Impact
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
                Operational Advantages for Municipalities
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Reduce Avoidable Repeat Excavation
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Identify overlapping works while still in the planning phase, stopping contractors from tearing up freshly surfaced bitumen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Improve Cross-Department Coordination
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Provides Roads, Water, Electricity, and Telecom agencies a unified source of operational truth rather than unaligned spreadsheets.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Informed, Gated Approvals
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Approval authorities see proximity reports and acknowledgment status directly within the review queue before authorizing tenders.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Preserve an Accountable Decision History
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Permanently answers municipal inquiries and public audits regarding why road sections were scheduled or overridden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FINAL CTA */}
        <section className="py-20 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Make every excavation count.
            </h2>
            <p className="text-base sm:text-lg text-blue-100 max-w-xl mx-auto">
              Give every department a shared view of what is happening, where, and when across the entire municipal network.
            </p>
            <div className="pt-4">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-blue-600 font-bold text-sm hover:bg-blue-50 active:scale-[0.98] transition shadow-lg shadow-blue-700/30"
              >
                Open CivicSync Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
