"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Calendar, PlusCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Board", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/new-post", label: "New Post", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 pb-safe">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[48px] transition-colors",
                active ? "text-[#0A66C2]" : "text-zinc-500 active:text-zinc-300"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
