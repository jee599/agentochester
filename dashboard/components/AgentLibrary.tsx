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
  external: "text-cyan-400",
  builtin: "text-violet-400",
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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    name: string;
    description: string;
    identity: { personality: string; communication: string; thinking: string };
    critical_rules: { must: string[]; must_not: string[] };
    deliverables: string[];
    success_metrics: string[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="text-rose-400 text-xs font-mono">{t("agents.load_error")}: {error}</div>;
  if (!data) return <div className="text-slate-500 text-xs font-mono">{t("agents.loading")}</div>;

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
          className="bg-slate-900 border border-slate-700/50 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 w-56 focus:outline-none focus:border-violet-500/50"
        />
        <select
          value={selectedDivision || ""}
          onChange={(e) => setSelectedDivision(e.target.value || null)}
          className="bg-slate-900 border border-slate-700/50 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
        >
          <option value="" className="bg-slate-900">{t("agents.all_divisions")}</option>
          {data.divisions.map((d) => (
            <option key={d.name} value={d.name} className="bg-slate-900">
              {t(`div.${d.label}`) !== `div.${d.label}` ? t(`div.${d.label}`) : d.label} ({d.agents.length})
            </option>
          ))}
        </select>
        <span className="text-[11px] font-mono text-slate-500 ml-auto">
          {totalFiltered} {t("agents.total")} · {t("agents.divisions_count", { n: filteredDivisions.length })}
        </span>
      </div>

      {/* Divisions */}
      {filteredDivisions.map((division) => (
        <div key={division.name} className="mb-5">
          <div className="flex items-center gap-2 mb-1.5 border-b border-slate-700/30 pb-1.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t(`div.${division.label}`) !== `div.${division.label}` ? t(`div.${division.label}`) : division.label}
            </h2>
            <span className="text-[10px] font-mono text-slate-600">{division.agents.length}</span>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1 -mx-1">
            <span className="w-52 shrink-0">{t("agents.col.name")}</span>
            <span className="w-44 shrink-0">{t("agents.col.role")}</span>
            <span className="w-24 shrink-0">{t("agents.col.source")}</span>
            <span>{t("agents.col.division")}</span>
          </div>

          {/* Agent table rows */}
          <div className="divide-y divide-slate-700/20">
            {division.agents.map((agent) => {
              const srcColor = SOURCE_COLOR[agent.source] ?? "text-slate-400";
              const srcLabel = SOURCE_LABEL[agent.source] ?? agent.source;
              const isSelected = selectedRole === `${division.name}:${agent.role}`;
              const key = `${division.name}:${agent.role}`;

              const handleClick = async () => {
                if (isSelected) {
                  setSelectedRole(null);
                  setDetail(null);
                  return;
                }
                setSelectedRole(key);
                setDetail(null);
                setDetailLoading(true);
                try {
                  const res = await fetch(`/api/agents/detail?role=${encodeURIComponent(agent.role)}`);
                  if (res.ok) setDetail(await res.json());
                } finally {
                  setDetailLoading(false);
                }
              };

              return (
                <div key={`${division.name}-${agent.role}`}>
                  <div
                    onClick={handleClick}
                    className={`flex items-center gap-3 py-1.5 text-xs px-1 -mx-1 rounded transition-colors cursor-pointer ${
                      isSelected ? "bg-violet-500/10" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="text-slate-100 w-52 truncate shrink-0">{agent.name}</span>
                    <span className="font-mono text-slate-500 w-44 truncate shrink-0">{agent.role}</span>
                    <span className={`${srcColor} text-[10px] w-24 shrink-0`}>{srcLabel}</span>
                    <span className="text-slate-600 text-[10px] truncate">{t(`div.${division.label}`) !== `div.${division.label}` ? t(`div.${division.label}`) : division.label}</span>
                  </div>
                  {isSelected && (
                    <div className="px-3 py-3 mb-2 ml-1 border-l-2 border-violet-500/30 text-xs space-y-3 bg-slate-900/50 rounded-r">
                      {detailLoading ? (
                        <div className="text-slate-500 font-mono animate-pulse">loading...</div>
                      ) : detail ? (
                        <>
                          {/* Identity */}
                          {detail.identity.personality && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">Identity</div>
                              <div className="text-slate-300 leading-relaxed">{detail.identity.personality}</div>
                              {detail.identity.communication && (
                                <div className="text-slate-400 mt-1"><span className="text-slate-500">Communication:</span> {detail.identity.communication}</div>
                              )}
                              {detail.identity.thinking && (
                                <div className="text-slate-400 mt-1"><span className="text-slate-500">Thinking:</span> {detail.identity.thinking}</div>
                              )}
                            </div>
                          )}

                          {/* Rules */}
                          {(detail.critical_rules.must.length > 0 || detail.critical_rules.must_not.length > 0) && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">Rules</div>
                              {detail.critical_rules.must.length > 0 && (
                                <div className="mb-1.5">
                                  <span className="text-emerald-400 text-[10px] font-mono">MUST</span>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {detail.critical_rules.must.map((r, i) => (
                                      <li key={i} className="text-slate-400 pl-2 border-l border-emerald-500/20">{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {detail.critical_rules.must_not.length > 0 && (
                                <div>
                                  <span className="text-rose-400 text-[10px] font-mono">MUST NOT</span>
                                  <ul className="mt-0.5 space-y-0.5">
                                    {detail.critical_rules.must_not.map((r, i) => (
                                      <li key={i} className="text-slate-400 pl-2 border-l border-rose-500/20">{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deliverables */}
                          {detail.deliverables.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">Deliverables</div>
                              <ul className="space-y-0.5">
                                {detail.deliverables.map((d, i) => (
                                  <li key={i} className="text-slate-400 pl-2 border-l border-violet-500/20">{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Success Metrics */}
                          {detail.success_metrics.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-violet-400 mb-1">Success Metrics</div>
                              <ul className="space-y-0.5">
                                {detail.success_metrics.map((m, i) => (
                                  <li key={i} className="text-slate-400 pl-2 border-l border-cyan-500/20">{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Tags */}
                          {agent.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {agent.tags.slice(0, 12).map((tag) => (
                                <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-600 italic">No detail available</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
