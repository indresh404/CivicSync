"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  HardHat,
  Droplets,
  Zap,
  Radio,
  Flame,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { loginUser } from "@/lib/api";

const DEMO_PRESETS = [
  {
    role: "ADMIN",
    title: "City Commissioner (Admin)",
    email: "admin@digsync.gov",
    dept: "Municipal Administration",
    icon: Building2,
    color: "bg-slate-900 text-white",
  },
  {
    role: "DEPARTMENT_USER",
    title: "Chief Roads Engineer",
    email: "roads@digsync.gov",
    dept: "Roads Department",
    icon: HardHat,
    color: "bg-blue-600 text-white",
  },
  {
    role: "DEPARTMENT_USER",
    title: "Water Works Officer",
    email: "water@digsync.gov",
    dept: "Water Department",
    icon: Droplets,
    color: "bg-cyan-600 text-white",
  },
  {
    role: "DEPARTMENT_USER",
    title: "Power Grid Manager",
    email: "electricity@digsync.gov",
    dept: "Electricity Department",
    icon: Zap,
    color: "bg-amber-600 text-white",
  },
  {
    role: "DEPARTMENT_USER",
    title: "Fiber Infrastructure Lead",
    email: "telecom@digsync.gov",
    dept: "Telecom Department",
    icon: Radio,
    color: "bg-purple-600 text-white",
  },
  {
    role: "DEPARTMENT_USER",
    title: "City Gas Utility Inspector",
    email: "gas@digsync.gov",
    dept: "Gas Department",
    icon: Flame,
    color: "bg-pink-600 text-white",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@digsync.gov");
  const [password, setPassword] = useState("DigSync2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(email, password);
      if (typeof window !== "undefined") {
        localStorage.setItem("digsync_token", res.access_token);
        localStorage.setItem("digsync_user", JSON.stringify(res.user));
      }
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your login details.");
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword("DigSync2026!");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans selection:bg-blue-100">
      {/* Brand Panel (Left) */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">
              D
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">DigSync</span>
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                Municipal Road-Work Coordination
              </span>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Deterministic & Zero-Overlap Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
              Preventing Repeated Road Digging Across City Agencies.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              DigSync provides a unified geospatial map and deterministic conflict detection for Roads, Water, Electricity, Gas, Sewerage, and Telecom departments before excavation permits are approved.
            </p>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 space-y-3 py-8 border-y border-slate-800">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Pre-approval spatial & date overlap detection</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Underground-first sequencing & Joint Trenching</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>24-month resurfacing cooldown & monsoon warnings</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Immutable audit trail and citizen transparency</span>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>Official Municipal Gateway</span>
          <Link href="/works" className="hover:text-white underline underline-offset-4">
            Public Citizen Works Map
          </Link>
        </div>
      </div>

      {/* Form Panel (Right) */}
      <div className="lg:col-span-7 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-12 max-w-2xl mx-auto w-full">
        <div className="space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Municipal Staff Sign In
          </h2>
          <p className="text-sm text-slate-600">
            Enter your departmental credentials or select a simulated profile to test live workflows.
          </p>
        </div>

        {/* Demo Account Picker */}
        <div className="mb-6 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Quick Demo Account Switcher
            </span>
            <span className="text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Password: DigSync2026!
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_PRESETS.map((p) => {
              const Icon = p.icon;
              const isSelected = email === p.email;
              return (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => selectPreset(p.email)}
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-white shadow-sm ring-1 ring-blue-600"
                      : "border-slate-200 bg-white/80 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${p.color}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 truncate">
                      {p.dept.replace(" Department", "")}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">{p.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Departmental Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@digsync.gov"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition font-semibold text-sm text-white shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Authentication...</span>
              ) : (
                <>
                  <span>Sign In to DigSync</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800">
            ← Back to Homepage
          </Link>
          <Link href="/works" className="font-semibold text-blue-600 hover:underline">
            Citizen Public Works Map →
          </Link>
        </div>
      </div>
    </div>
  );
}
