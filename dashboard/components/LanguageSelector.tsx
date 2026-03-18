"use client";

import { useLocale } from "@/lib/locale-context";
import { LOCALES } from "@/lib/i18n";

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as typeof locale)}
      className="bg-transparent border border-slate-700/50 rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code} className="bg-slate-900">
          {l.flag} {l.code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
