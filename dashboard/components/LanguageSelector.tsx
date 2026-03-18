"use client";

import { useLocale } from "@/lib/locale-context";
import { LOCALES } from "@/lib/i18n";

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as typeof locale)}
      className="bg-transparent border border-stone-800 rounded px-2 py-1 text-[11px] font-mono text-stone-400 focus:outline-none focus:border-stone-600 cursor-pointer"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code} className="bg-stone-900">
          {l.flag}
        </option>
      ))}
    </select>
  );
}
