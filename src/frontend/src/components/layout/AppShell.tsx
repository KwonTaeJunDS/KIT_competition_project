"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isStudentRoute =
    pathname === "/today" ||
    pathname === "/notes" ||
    pathname === "/review" ||
    pathname === "/solve";
  const hideGlobalBottomNav =
    isStudentRoute;

  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#0b0b0d]">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  if (isStudentRoute) {
    return (
      <div className="min-h-screen bg-[#0b0b0d]">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 sm:pb-32">
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      {!hideGlobalBottomNav && <BottomNav />}
    </div>
  );
}
