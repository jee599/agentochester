"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";

interface Agent {
  name: string;
  role: string;
  description: string;
  source: "external" | "builtin" | "generated";
  tags: string[];
}

interface Division {
  name: string;
  label: string;
  agents: Agent[];
}

interface AgentsResponse {
  divisions: Division[];
  total: number;
}

const SOURCE_COLOR: Record<string, string> = {
  external: "text-blue-400",
  builtin: "text-emerald-400",
  generated: "text-amber-400",
};

const SOURCE_LABEL: Record<string, string> = {
  external: "agency-agents",
  builtin: "builtin",
  generated: "generated",
};

export default function AgentLibrary() {
  const { t } = useLocale();
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-red-400 text-xs font-mono">{t("agents.load_error")}: {error}</div>;
  if (!data) return <div className="text-stone-600 text-xs font-mono">{t("agents.loading")}</div>;

  const filteredDivisions = data.divisions
    .filter((d) => !selectedDivision || d.name === selectedDivision)
    .map((d) => ({
      ...d,
      agents: d.agents.filter(
        (a) =>
          !filter ||
          a.name.toLowerCase().includes(filter.toLowerCase()) ||
          a.role.toLowerCase().includes(filter.toLowerCase())
      ),
    }))
    .filter((d) => d.agents.length > 0);

  const totalFiltered = filteredDivisions.reduce((sum, d) => sum + d.agents.length, 0);

  return (
    <div>
      {/* Search + filter row */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder={t("agents.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-stone-900/50 border border-stone-800 rounded px-2.5 py-1.5 text-xs font-mono text-stone-300 placeholder:text-stone-700 w-56 focus:outline-none focus:border-stone-600"
        />
        <select
          value={selectedDivision || ""}
          onChange={(e) => setSelectedDivision(e.target.value || null)}
          className="bg-stone-900/50 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-stone-400 focus:outline-none focus:border-stone-600 cursor-pointer"
        >
          <option value="" className="bg-stone-900">{t("agents.all_divisions")}</option>
          {data.divisions.map((d) => (
            <option key={d.name} value={d.name} className="bg-stone-900">
              {d.label} ({d.agents.length})
            </option>
          ))}
        </select>
        <span className="text-[11px] font-mono text-stone-600 ml-auto">
          {totalFiltered} {t("agents.total")} · {filteredDivisions.length} divisions
        </span>
      </div>

      {/* Divisions */}
      {filteredDivisions.map((division) => (
        <div key={division.name} className="mb-5">
          <div className="flex items-center gap-2 mb-1.5 border-b border-stone-800/30 pb-1.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
              {division.label}
            </h2>
            <span className="text-[10px] font-mono text-stone-700">{division.agents.length}</span>
          </div>

          {/* Agent table rows */}
          <div className="divide-y divide-stone-800/20">
            {division.agents.map((agent) => {
              const srcColor = SOURCE_COLOR[agent.source] ?? "text-stone-400";
              const srcLabel = SOURCE_LABEL[agent.source] ?? agent.source;
              return (
                <div
                  key={`${division.name}-${agent.role}`}
                  className="flex items-center gap-3 py-1.5 text-xs hover:bg-stone-900/50 px-1 -mx-1 rounded transition-colors group"
                >
                  <span className="text-stone-200 w-52 truncate shrink-0">{agent.name}</span>
                  <span className="font-mono text-stone-600 w-44 truncate shrink-0">{agent.role}</span>
                  <span className={`${srcColor} text-[10px] w-24 shrink-0`}>{srcLabel}</span>
                  <span className="text-stone-700 text-[10px] truncate">{division.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
