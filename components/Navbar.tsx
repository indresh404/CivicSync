"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, Layers, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm"
          : "bg-white/80 backdrop-blur-sm border-b border-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition">
            {/* Custom SVG mark representing synchronized urban layers */}
            <svg
              className="w-5 h-5 fill-none stroke-current stroke-2"
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
              CivicSync
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                GovTech
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/works"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            Citizen Works Map
          </Link>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 transition"
          >
            Capabilities
          </a>
        </nav>

        {/* Primary Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold px-3.5 py-2 text-slate-700 hover:text-blue-600 transition"
          >
            Staff Sign In
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition shadow-sm shadow-blue-600/20"
          >
            Operations Hub
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <a
            href="#platform"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Platform
          </a>
          <a
            href="#problem"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            The Problem
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Capabilities
          </a>
          <a
            href="#benefits"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Benefits
          </a>
          <div className="pt-2">
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-base font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Open CivicSync Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
