"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSelector from "./LanguageSelector";
import Logo from "./Logo";
import { useLocale } from "@/lib/locale-context";

export default function NavBar() {
  const { t } = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: t("nav.dashboard") },
    { href: "/agents", label: t("nav.agents") },
    { href: "/terminal", label: "Terminal" },
  ];

  return (
    <nav className="border-b border-slate-700/50 px-6 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-violet-400">
              <Logo size={30} />
            </span>
            <span className="text-sm font-bold text-white tracking-tight">{t("app.title")}</span>
            <span className="text-[10px] font-mono text-slate-500">{t("app.version")}</span>
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
                      ? "bg-violet-500/10 text-violet-400 border border-violet-500/50"
                      : "text-slate-400 hover:text-slate-200"
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
