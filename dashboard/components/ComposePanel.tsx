"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";

interface TaskResult {
  task: {
    id: string;
    role: string;
    action: string;
    depends_on: string[];
    file_scope: string[];
  };
  match: {
    agent: { name: string; role: string; source: { type: string }; description: string } | null;
    matchType: "exact" | "fuzzy" | "none";
    candidates?: Array<{ name: string; score: number }>;
  };
}

interface ComposeResult {
  prompt: string;
  tasks: TaskResult[];
  summary: {
    totalTasks: number;
    matched: number;
    unmatched: number;
  };
}

const MATCH_DOT: Record<string, string> = {
  exact: "bg-emerald-400",
  fuzzy: "bg-cyan-400",
  none: "bg-amber-400",
};

const SOURCE_STYLE: Record<string, { label: string; color: string }> = {
  external: { label: "agency-agents", color: "text-cyan-400" },
  builtin: { label: "builtin", color: "text-violet-400" },
  generated: { label: "generated", color: "text-amber-400" },
};

interface ExecutionResult {
  results: Array<{
    taskId: string;
    role: string;
    agentName: string;
    status: "success" | "error" | "skipped";
    output: string;
    error?: string;
    durationMs: number;
  }>;
  totalDurationMs: number;
  summary: { total: number; success: number; error: number; skipped: number };
}

export default function ComposePanel() {
  const { t } = useLocale();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const handleCompose = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExecResult(null);
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compose failed");
    } finally {
      setLoading(false);
    }
  };

  const [liveOutputs, setLiveOutputs] = useState<Record<string, string>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});
  const [taskTimers, setTaskTimers] = useState<Record<string, number>>({});

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    setExecuting(true);
    setError(null);
    setExecResult(null);
    setLiveOutputs({});
    setTaskStatuses({});
    setTaskTimers({});
    setExpandedResults(new Set());

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const results: ExecutionResult["results"] = [];
      let totalDurationMs = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "task_start") {
              setTaskStatuses((prev) => ({ ...prev, [data.taskId]: data.status }));
              setTaskTimers((prev) => ({ ...prev, [data.taskId]: Date.now() }));
            } else if (eventType === "task_output") {
              setLiveOutputs((prev) => ({
                ...prev,
                [data.taskId]: (prev[data.taskId] || "") + data.chunk,
              }));
            } else if (eventType === "task_done") {
              setTaskStatuses((prev) => ({ ...prev, [data.taskId]: data.status }));
              results.push({
                taskId: data.taskId,
                role: data.role || "",
                agentName: data.agentName || "",
                status: data.status,
                output: data.output || "",
                error: data.error,
                durationMs: data.durationMs || 0,
              });
            } else if (eventType === "done") {
              totalDurationMs = data.totalDurationMs;
            }
          }
        }
      }

      setExecResult({
        results,
        totalDurationMs,
        summary: {
          total: results.length,
          success: results.filter((r) => r.status === "success").length,
          error: results.filter((r) => r.status === "error").length,
          skipped: 0,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCompose();
    }
  };

  const toggleResult = (taskId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5 font-mono">
          {t("compose.label")}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("compose.placeholder")}
          rows={3}
          className="w-full bg-slate-900 border border-slate-700/50 rounded px-3 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-slate-500 font-mono">{t("compose.hint")} · ⌘ Enter</span>
          <button
            onClick={handleCompose}
            disabled={loading || !prompt.trim()}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 px-5 py-1.5 rounded text-xs font-semibold text-white transition-all cursor-pointer"
          >
            {loading ? t("compose.composing") : t("compose.button")}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-rose-400 text-xs bg-rose-950/30 border border-rose-900/50 rounded px-3 py-2 font-mono">
          {error}
        </div>
      )}

      {/* Decomposed Tasks */}
      {result && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
            <div className="font-mono text-xs text-slate-400 flex items-center gap-3">
              <span className="text-slate-100">{result.summary.totalTasks}</span>
              <span>{t("compose.tasks_decomposed")}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400">{result.summary.matched}</span>
              <span>{t("compose.matched")}</span>
              {result.summary.unmatched > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400">{result.summary.unmatched}</span>
                  <span>{t("compose.unmatched")}</span>
                </>
              )}
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || result.summary.matched === 0}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 px-4 py-1.5 rounded text-xs font-semibold text-white transition-all cursor-pointer"
            >
              {executing
                ? t("compose.executing")
                : t("compose.execute_n", { n: result.summary.matched })}
            </button>
          </div>

          {/* Task rows */}
          <div className="divide-y divide-slate-700/30">
            {result.tasks.map((tr) => {
              const sourceStyle = tr.match.agent
                ? SOURCE_STYLE[tr.match.agent.source.type] ?? { label: tr.match.agent.source.type, color: "text-slate-400" }
                : null;

              return (
                <div key={tr.task.id} className="py-2.5 group">
                  {/* Primary row */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-500 w-14 shrink-0">{tr.task.id}</span>
                    <span className="font-mono text-white w-48 shrink-0 truncate">
                      {t(`role.${tr.task.role}`) !== `role.${tr.task.role}` ? t(`role.${tr.task.role}`) : tr.task.role.replace(/_/g, " ")}
                    </span>
                    {tr.match.agent ? (
                      <>
                        <span className="text-slate-500">{t("compose.arrow")}</span>
                        <span className="text-slate-200 truncate">{tr.match.agent.name}</span>
                        <span className={`${sourceStyle?.color} text-[10px]`}>[{sourceStyle?.label}]</span>
                      </>
                    ) : (
                      <span className="text-amber-400/70">{t("compose.no_match")}</span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${MATCH_DOT[tr.match.matchType]}`} />
                      <span className="text-slate-500 text-[10px] font-mono">{tr.match.matchType}</span>
                    </span>
                  </div>
                  {/* Secondary row */}
                  <div className="flex items-center gap-2 text-[11px] mt-0.5 pl-14">
                    <span className="text-slate-500 truncate">{tr.task.action}</span>
                    {tr.task.file_scope.length > 0 && (
                      <span className="font-mono text-slate-600 shrink-0">{tr.task.file_scope.join(", ")}</span>
                    )}
                    {tr.task.depends_on.length > 0 && (
                      <span className="text-slate-600 font-mono shrink-0">{t("compose.dep_arrow")} {tr.task.depends_on.join(", ")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Execution Progress */}
      {executing && Object.keys(taskStatuses).length > 0 && (
        <div className="space-y-2 border-t border-slate-700/50 pt-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">{t("exec.executing")}</span>
          </div>
          {Object.entries(taskStatuses).map(([taskId, status]) => (
            <div key={taskId} className="py-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  status === "running" ? "bg-emerald-400 animate-pulse" :
                  status === "success" ? "bg-emerald-400" :
                  "bg-rose-400"
                }`} />
                <span className="font-mono text-slate-200">{taskId}</span>
                <span className={`text-[10px] font-mono ${
                  status === "running" ? "text-slate-400" :
                  status === "success" ? "text-emerald-400" :
                  "text-rose-400"
                }`}>{status}</span>
                {status === "running" && taskTimers[taskId] && (
                  <span className="text-[10px] font-mono text-slate-500 ml-auto">
                    {((Date.now() - taskTimers[taskId]) / 1000).toFixed(0)}s
                  </span>
                )}
              </div>
              {liveOutputs[taskId] && (
                <pre className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-700/30 rounded px-2 py-1.5 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap leading-tight">
                  {liveOutputs[taskId]}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Execution Result */}
      {execResult && (
        <div className="space-y-2 border-t border-slate-700/50 pt-3">
          {/* Summary */}
          <div className="font-mono text-xs text-slate-400 flex items-center gap-3">
            <span className="text-slate-100">{t("exec.title")}</span>
            <span className="text-slate-600">·</span>
            <span>{t("exec.completed_in")} {(execResult.totalDurationMs / 1000).toFixed(1)}s</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400">{execResult.summary.success} {t("exec.success")}</span>
            {execResult.summary.error > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-rose-400">{execResult.summary.error} {t("exec.error")}</span>
              </>
            )}
            {execResult.summary.skipped > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400">{execResult.summary.skipped} {t("exec.skipped")}</span>
              </>
            )}
          </div>

          {/* Result rows */}
          <div className="divide-y divide-slate-700/30">
            {execResult.results.map((r) => (
              <div key={r.taskId} className="py-2">
                <button
                  onClick={() => toggleResult(r.taskId)}
                  className="w-full flex items-center gap-2 text-xs text-left cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    r.status === "success" ? "bg-emerald-400" :
                    r.status === "error" ? "bg-rose-400" :
                    "bg-amber-400"
                  }`} />
                  <span className="font-mono text-slate-200">{r.agentName}</span>
                  <span className="font-mono text-slate-500">{r.role}</span>
                  <span className="ml-auto font-mono text-slate-500 text-[10px]">
                    {(r.durationMs / 1000).toFixed(1)}s
                  </span>
                  <span className="text-slate-600 text-[10px]">
                    {expandedResults.has(r.taskId) ? "▼" : "▶"} <span className="text-slate-600">{t("exec.click_to_expand")}</span>
                  </span>
                </button>
                {expandedResults.has(r.taskId) && (
                  <>
                    {r.output && (
                      <pre className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-700/30 rounded px-2 py-1.5 mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap leading-tight">
                        {r.output}
                      </pre>
                    )}
                    {r.error && (
                      <div className="text-[11px] font-mono text-rose-400 mt-1">{r.error}</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
