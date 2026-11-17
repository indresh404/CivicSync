"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  Bot,
  User,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Coins,
  Key,
  ExternalLink,
  Check,
  Loader2,
  Copy,
  Info,
} from "lucide-react";
import { Conflict, Project } from "@/lib/types";
import {
  analyzeConflictAI,
  chatCopilotAI,
  createManusConversation,
  sendManusMessage,
} from "@/lib/api";

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  projects: Project[];
  selectedConflict?: Conflict | null;
}

export default function AICopilotDrawer({
  isOpen,
  onClose,
  conflicts,
  projects,
  selectedConflict,
}: AICopilotDrawerProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "analysis" | "settings">("chat");

  // Manus AI Agent Session State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [manusTaskId, setManusTaskId] = useState<string | null>(null);
  const [manusTaskUrl, setManusTaskUrl] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<
    { role: "user" | "copilot"; text: string; time: string; engine?: string }[]
  >([
    {
      role: "copilot",
      text: "Hello! I am your **CivicSync AI Copilot** powered by Manus AI Agent V2 for Mira Road municipal infrastructure. I monitor cross-department projects, investigate spatial-temporal clashes, enforce the mandatory *Underground-before-Surface* sequencing rule, and estimate rework savings. How can I assist you today?",
      time: "Just now",
      engine: "Manus AI Agent V2",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Analysis State
  const [selectedConfId, setSelectedConfId] = useState<string>(
    selectedConflict?.id || (conflicts.length > 0 ? conflicts[0].id : "")
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Gemini API Key State
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [savedKeyMsg, setSavedKeyMsg] = useState(false);

  useEffect(() => {
    // Load stored key from localStorage if available
    const saved = localStorage.getItem("CIVICSYNC_GEMINI_KEY") || "";
    setGeminiKey(saved);
  }, []);

  useEffect(() => {
    if (selectedConflict) {
      setSelectedConfId(selectedConflict.id);
      setActiveTab("analysis");
    }
  }, [selectedConflict]);

  const handleSaveKey = () => {
    localStorage.setItem("CIVICSYNC_GEMINI_KEY", geminiKey.trim());
    setSavedKeyMsg(true);
    setTimeout(() => setSavedKeyMsg(false), 2500);
  };

  const handleSendMessage = async (customQuery?: string) => {
    const q = (customQuery || inputQuery).trim();
    if (!q || isSending) return;

    const userMsg = {
      role: "user" as const,
      text: q,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsSending(true);

    try {
      let replyText = "";
      let engineName = "Manus AI Agent V2";

      if (!conversationId) {
        const session = await createManusConversation(q);
        if (session && session.conversation_id) {
          setConversationId(session.conversation_id);
          if (session.task_id) setManusTaskId(session.task_id);
          if (session.task_url) setManusTaskUrl(session.task_url);
          replyText = session.initial_response || "Municipal query registered with Manus AI Agent.";
        } else {
          const fallbackRes = await chatCopilotAI(q, geminiKey);
          replyText = fallbackRes.reply;
          engineName = fallbackRes.engine || "CivicSync AI Engine";
        }
      } else {
        const res = await sendManusMessage(conversationId, q);
        replyText = res.content;
        if (res.task_id) setManusTaskId(res.task_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "copilot",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          engine: engineName,
        },
      ]);
    } catch (err) {
      const fallbackRes = await chatCopilotAI(q, geminiKey);
      setMessages((prev) => [
        ...prev,
        {
          role: "copilot",
          text: fallbackRes.reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          engine: "CivicSync Fallback Engine",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedConfId) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeConflictAI(selectedConfId, geminiKey);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 text-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white">CivicSync AI Copilot</h2>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
                Mira Road MMR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Intelligent Municipal Urban Twin Advisor</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 px-3 pt-2 gap-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "chat"
              ? "border-cyan-400 text-cyan-300 bg-slate-800/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Copilot Chat
        </button>
        <button
          onClick={() => setActiveTab("analysis")}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "analysis"
              ? "border-cyan-400 text-cyan-300 bg-slate-800/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Conflict Intel
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "settings"
              ? "border-cyan-400 text-cyan-300 bg-slate-800/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          AI Key Config
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: COPILOT CHAT */}
        {activeTab === "chat" && (
          <div className="space-y-4 flex flex-col h-full justify-between">
            <div className="space-y-3 overflow-y-auto pr-1">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "copilot" && (
                    <div className="w-6 h-6 rounded-md bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-none space-y-1.5"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400/80 pt-1 border-t border-slate-700/40">
                      <span>{m.time}</span>
                      {m.engine && <span className="text-cyan-400/80">{m.engine}</span>}
                    </div>
                  </div>
                  {m.role === "user" && (
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex gap-2.5 items-center text-xs text-cyan-400 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing municipal records & sequencing rules...
                </div>
              )}
            </div>

            {/* Manus AI Agent Active Telemetry */}
            {manusTaskId && (
              <div className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Manus AI Task: <code className="font-mono text-white">{manusTaskId.slice(0, 10)}...</code></span>
                </div>
                {manusTaskUrl && (
                  <a
                    href={manusTaskUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-semibold"
                  >
                    View Task <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Quick Prompt Chips */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-400 font-medium">Suggested queries:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Show all ongoing infrastructure projects in Mira Road",
                  "Explain critical conflicts and road clashing details",
                  "Which departments have pending acknowledgments?",
                  "Summarize this week's construction activities",
                  "Show the history of Mira Bhayandar Road",
                  "What is the Monsoon digging moratorium period?",
                ].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition hover:text-white"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask Municipal Copilot about roads, sequencing, or conflicts..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuery.trim() || isSending}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFLICT INTELLIGENCE */}
        {activeTab === "analysis" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Active Spatial-Temporal Conflict:
              </label>
              <select
                value={selectedConfId}
                onChange={(e) => setSelectedConfId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {conflicts.map((c) => {
                  const pA = projects.find((p) => p.id === c.project_a_id);
                  const pB = projects.find((p) => p.id === c.project_b_id);
                  return (
                    <option key={c.id} value={c.id}>
                      [{c.severity_level.toUpperCase()}] {c.id}: {pA?.name || "Project A"} vs {pB?.name || "Project B"}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !selectedConfId}
                className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running Deep AI Analysis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Synthesize Municipal Conflict Brief
                  </>
                )}
              </button>
            </div>

            {analysisResult && (
              <div className="space-y-3 animate-in fade-in duration-300">
                {/* Metric Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      Traffic Disruption
                    </div>
                    <div className="text-lg font-bold font-mono text-rose-400">
                      {analysisResult.traffic_disruption_index}%
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-semibold uppercase">
                      {analysisResult.disruption_level} Risk
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      Cost Avoided
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      {analysisResult.estimated_rework_cost_avoided}
                    </div>
                    <span className="text-[10px] text-slate-400">Prevented re-dig</span>
                  </div>
                </div>

                {/* Sequencing Protocol Directive */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Deterministic Civil Rule Directive
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {analysisResult.recommended_sequence}
                  </p>
                </div>

                {/* Joint Trenching Advice */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <span className="font-semibold text-slate-200">Joint-Trenching Protocol:</span>
                  <p className="text-slate-400">{analysisResult.joint_trenching_guidance}</p>
                </div>

                {/* Gemini AI Synthesis (if available) */}
                {analysisResult.ai_synthesis && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-b from-blue-950/40 to-slate-950 border border-blue-500/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Google Gemini 1.5 Flash Synthesis
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {analysisResult.ai_synthesis}
                    </p>
                  </div>
                )}

                {/* Public Notice Draft */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Draft Ward Public Advisory:</span>
                    <button
                      onClick={() => copyToClipboard(analysisResult.public_advisory_draft)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedDraft ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedDraft ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    "{analysisResult.public_advisory_draft}"
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AI KEY CONFIGURATION */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {/* Active Groq Cloud Status Card */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Groq Cloud AI Active
                </span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  Ultra-Fast &lt;200ms
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Groq Cloud API is connected with models <code className="text-cyan-300 font-mono">openai/gpt-oss-120b</code> &amp; <code className="text-cyan-300 font-mono">qwen/qwen3.8-27b</code> for instant municipal copilot answers and conflict analysis briefs.
              </p>
            </div>

            {/* Google Gemini API Configuration */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Key className="w-4 h-4" />
                Google Gemini API (Secondary Fallback)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Optionally connect your Google Gemini API key as an alternate multimodal provider.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveKey}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Key
                </button>
                {savedKeyMsg && (
                  <span className="text-xs text-emerald-400 font-medium animate-in fade-in">
                    Key saved to local session!
                  </span>
                )}
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                How to get a Free Google Gemini API Key:
              </div>
              <ol className="list-decimal list-inside space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  Go to{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline inline-flex items-center gap-0.5 hover:text-cyan-300"
                  >
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Sign in with your Google Account and click <strong className="text-slate-200">"Create API Key"</strong>.</li>
                <li>Copy the generated key (it starts with <code className="text-cyan-300">AIzaSy...</code>).</li>
                <li>Paste it in the box above or set it as <code className="text-cyan-300">GEMINI_API_KEY</code> in <code className="text-slate-300">.env.local</code>.</li>
              </ol>

              <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300">
                <strong>Zero-Cost & Safe Fallback:</strong> If no API key is entered, CivicSync automatically operates using its built-in deterministic civil engineering heuristic engine with 100% reliability.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
