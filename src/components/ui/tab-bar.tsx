"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Receipt, Repeat, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "ホーム", icon: LayoutGrid },
  { href: "/expenses", label: "支出", icon: Receipt },
  { href: "/subscriptions", label: "サブスク", icon: Repeat },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[440px] border-t border-border bg-surface/95 backdrop-blur">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
              active ? "text-accent" : "text-text-muted hover:text-text-secondary",
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
