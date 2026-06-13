"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarDays, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#e8eaed]">
      <div className="flex items-center justify-around h-[72px] pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            >
              <span
                className={`flex items-center justify-center h-8 w-16 rounded-full transition-colors ${
                  active ? "bg-[#d3e3fd]" : "bg-transparent"
                }`}
              >
                <Icon
                  size={22}
                  className={active ? "text-[#0b57d0]" : "text-[#5f6368]"}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span
                className={`text-[12px] ${
                  active ? "text-[#0b57d0] font-medium" : "text-[#5f6368]"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
