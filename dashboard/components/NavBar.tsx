"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSelector from "./LanguageSelector";
import { useLocale } from "@/lib/locale-context";

export default function NavBar() {
  const { t } = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("nav.dashboard") },
    { href: "/agents", label: t("nav.agents") },
  ];

  return (
    <nav className="border-b border-stone-800/50 px-6 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">SpoonCompose</span>
            <span className="text-[10px] font-mono text-stone-600">v0.1</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    isActive
                      ? "bg-stone-800 text-white"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <LanguageSelector />
      </div>
    </nav>
  );
}
