"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import {
  AngbuilguIcon,
  ArchiveBoxIcon,
  CheomseongdaeIcon,
  ExamPaperIcon,
} from "@/components/icons/HistoricalIcons";

const NAV_ITEMS = [
  { label: "오늘", href: "/today", icon: CheomseongdaeIcon },
  { label: "학습", href: "/solve", icon: ExamPaperIcon },
  { label: "오답", href: "/notes", icon: ArchiveBoxIcon },
  { label: "복습", href: "/review", icon: AngbuilguIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-5 pt-2 bg-gradient-to-t from-background via-background/70 to-transparent pointer-events-none">
      <div className="nav-shell pointer-events-auto overflow-hidden">
        <div className="nav-topline" />
        <div className="grid grid-cols-4 items-center gap-1 p-2">

          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/today" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-item",
                  isActive
                    ? "text-[var(--os-text-primary)] font-bold"
                    : "text-[var(--os-text-secondary)] hover:text-[var(--os-text-primary)]",
                )}
              >
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2 : 1.8}
                  className="transition-transform duration-200"
                />

                <span className="nav-label">{item.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="nav-indicator"
                    initial={false}
                    transition={{ type: "spring", stiffness: 360, damping: 32 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
