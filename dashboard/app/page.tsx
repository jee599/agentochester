"use client";

import ComposePanel from "@/components/ComposePanel";
import { useLocale } from "@/lib/locale-context";

export default function Home() {
  const { t } = useLocale();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white tracking-tight">{t("app.title")}</h1>
        <p className="text-sm text-stone-500 mt-0.5">{t("app.subtitle")}</p>
      </div>
      <ComposePanel />
    </div>
  );
}
