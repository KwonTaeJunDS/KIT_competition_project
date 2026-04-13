"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { AdminFrameLabel } from "@/components/admin/AdminDeskPrimitives";
import {
  AlertTriangle,
  BookOpenCheck,
  LayoutDashboard,
  LogOut,
  Send,
  Settings,
  Share2,
  Users,
} from "lucide-react";

type AdminMenuItem = {
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  helper: string;
};

const ADMIN_MENU: AdminMenuItem[] = [
  {
    label: "운영 대시보드",
    href: "/admin",
    icon: LayoutDashboard,
    helper: "학생별 이해 누수",
  },
  {
    label: "관계망 편집",
    href: "/admin/ontology",
    icon: Share2,
    helper: "노드와 엣지 편집",
  },
  {
    label: "학생 현황",
    href: "/admin/students",
    icon: Users,
    helper: "학생별 누수 상세",
  },
  {
    label: "전달 실패",
    icon: AlertTriangle,
    helper: "준비 중",
  },
  {
    label: "과제 배포",
    icon: Send,
    helper: "준비 중",
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentLabel =
    ADMIN_MENU.find((item) => item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
      ?.label ?? "운영실";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(184,134,11,0.18),transparent_20%),radial-gradient(circle_at_20%_18%,rgba(165,104,58,0.16),transparent_24%),linear-gradient(180deg,#0d0c0a_0%,#14110e_28%,#1a1510_100%)] text-stone-100 font-gothic">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 36px, rgba(255,255,255,0.05) 36px 37px), repeating-linear-gradient(90deg, transparent 0 36px, rgba(255,255,255,0.03) 36px 37px)",
        }}
      />
      <div className="relative mx-auto grid min-h-screen max-w-[1760px] grid-cols-1 xl:grid-cols-[296px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-stone-800/70 bg-[rgba(15,15,17,0.8)] backdrop-blur-xl xl:min-h-screen xl:border-b-0 xl:border-r">
          <div className="sticky top-0 flex h-full flex-col px-5 py-6 xl:h-screen xl:overflow-y-auto">
            <div className="rounded-[28px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-5 py-5 shadow-[0_18px_34px_rgba(0,0,0,0.28)]">
              <AdminFrameLabel text="Teacher Desk" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <BookOpenCheck size={18} />
                </div>
                <div>
                  <h1 className="text-[19px] font-semibold tracking-[-0.03em] text-stone-50">
                    교사용 운영실
                  </h1>
                  <p className="mt-1 text-[12px] leading-5 text-stone-400">학생별 이해 누수와 관계축 개입을 함께 보는 화면</p>
                </div>
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {ADMIN_MENU.map((item) => {
                const Icon = item.icon;
                const isActive = item.href
                  ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                  : false;

                const content = (
                  <>
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl border",
                        isActive
                          ? "border-amber-300/25 bg-amber-300/12 text-amber-100"
                          : "border-stone-700 bg-black/20 text-stone-400",
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold tracking-[-0.02em]">{item.label}</div>
                      <div className="mt-1 text-[11px] text-stone-500">{item.helper}</div>
                    </div>
                  </>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-[22px] border px-4 py-3 transition-colors duration-200",
                        isActive
                          ? "border-amber-300/25 bg-amber-300/10 text-stone-100 shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                          : "border-transparent bg-transparent text-stone-400 hover:border-stone-800 hover:bg-black/20 hover:text-stone-200",
                      )}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-[22px] border border-dashed border-stone-800 bg-black/10 px-4 py-3 text-stone-500"
                  >
                    {content}
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2 pt-6">
              <button className="flex w-full items-center gap-3 rounded-[18px] border border-stone-800 bg-black/20 px-4 py-3 text-[13px] font-semibold text-stone-300 transition-colors hover:bg-black/30 hover:text-stone-100">
                <Settings size={16} />
                운영 설정
              </button>
              <Link
                href="/today"
                className="flex w-full items-center gap-3 rounded-[18px] border border-stone-800 bg-black/20 px-4 py-3 text-[13px] font-semibold text-stone-300 transition-colors hover:bg-black/30 hover:text-stone-100"
              >
                <LogOut size={16} />
                학생 화면 보기
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-40 border-b border-stone-800/70 bg-[rgba(15,15,17,0.82)] backdrop-blur-xl">
            <div className="mx-auto flex h-[76px] w-full items-center justify-between px-5 sm:px-8 xl:px-10">
              <div>
                <AdminFrameLabel text={currentLabel} subtle />
                <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-stone-50">{currentLabel}</h2>
                <p className="mt-1 text-[12px] text-stone-400">학생 이해 누수를 먼저 보고 필요한 개입으로 바로 이어집니다.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-full border border-stone-800 bg-black/20 px-4 py-2 text-right shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-stone-500">LOGGED IN AS</p>
                  <p className="mt-1 text-[13px] font-semibold text-stone-100">이선생님</p>
                </div>
              </div>
            </div>
          </header>

          <section className="mx-auto w-full px-5 py-8 sm:px-8 xl:px-10">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
