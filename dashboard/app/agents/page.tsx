"use client";

import AgentLibrary from "@/components/AgentLibrary";
import { useLocale } from "@/lib/locale-context";

export default function AgentsPage() {
  const { t } = useLocale();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white tracking-tight">{t("agents.title")}</h1>
      </div>
      <AgentLibrary />
    </div>
  );
}
