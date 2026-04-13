"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";

export const historyTheme = {
  colors: {
    bg: "#0b0b0d",
    bgSoft: "#111111",
    ink: "#f5f5f4",
    inkMuted: "#a8a29e",
    line: "rgba(68,64,60,0.8)",
    lineSoft: "rgba(87,83,78,0.65)",
    amber: "#d97706",
    amberSoft: "rgba(217,119,6,0.12)",
    amberLine: "rgba(251,191,36,0.25)",
    paper: "rgba(255,248,235,0.06)",
    paperSoft: "rgba(255,248,235,0.02)",
  },
  radius: {
    shell: "34px",
    panel: "32px",
    card: "28px",
    chip: "999px",
  },
  shadow: {
    hero: "0 0 0 1px rgba(255,255,255,0.02), 0 30px 100px rgba(0,0,0,0.45)",
    featured: "0 18px 60px rgba(120,53,15,0.16)",
    floating: "0 15px 50px rgba(0,0,0,0.4)",
  },
  gradient: {
    page:
      "radial-gradient(circle at top, rgba(184,134,11,0.12), transparent 28%), linear-gradient(to bottom, rgba(255,255,255,0.02), transparent 24%), linear-gradient(to bottom, #0b0b0d, #111111 24%, #15120f 55%, #191410 100%)",
    hero:
      "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
    panel:
      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
    record:
      "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
    archive:
      "linear-gradient(180deg, rgba(255,248,235,0.06), rgba(255,248,235,0.02))",
    featured:
      "linear-gradient(180deg, rgba(217,119,6,0.12), rgba(255,255,255,0.02))",
    nextAction:
      "linear-gradient(180deg, rgba(120,113,108,0.22), rgba(28,25,23,0.35))",
  },
  typography: {
    display: "text-4xl md:text-6xl font-semibold tracking-[-0.05em]",
    title: "text-2xl md:text-[2rem] font-semibold tracking-[-0.03em]",
    sectionEyebrow: "text-[11px] uppercase tracking-[0.28em]",
    meta: "text-xs uppercase tracking-[0.22em]",
    body: "text-sm leading-7",
  },
} as const;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function HistoryPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 min-h-[calc(100vh-7rem)] w-screen -translate-x-1/2 overflow-x-clip bg-[#0b0b0d] text-stone-100">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: historyTheme.gradient.page }}
        />
        <PatternVeil />
        <GrainOverlay />
        <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 pb-40 pt-8 md:px-8 md:pb-44 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MotionSection({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function GrainOverlay({ dense = false }: { dense?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 mix-blend-screen",
        dense ? "opacity-[0.08]" : "opacity-[0.05]",
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.9) 0.45px, transparent 0.6px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.55) 0.45px, transparent 0.6px), radial-gradient(circle at 40% 70%, rgba(255,255,255,0.45) 0.45px, transparent 0.6px), linear-gradient(180deg, rgba(255,255,255,0.03), transparent 35%, rgba(255,255,255,0.01))",
        backgroundSize: dense
          ? "14px 14px, 18px 18px, 22px 22px, 100% 100%"
          : "20px 20px, 26px 26px, 28px 28px, 100% 100%",
      }}
    />
  );
}

export function PatternVeil() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%), repeating-linear-gradient(0deg, transparent 0 34px, rgba(255,255,255,0.03) 34px 35px), repeating-linear-gradient(90deg, transparent 0 34px, rgba(255,255,255,0.02) 34px 35px)",
      }}
    />
  );
}

export function FrameLabel({
  icon,
  text,
  subtle = false,
}: {
  icon?: React.ReactNode;
  text: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.28em]",
        subtle
          ? "border-stone-700/80 bg-black/20 text-stone-400"
          : "border-amber-300/20 bg-amber-300/10 text-amber-100/90",
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 flex flex-col gap-3">
      <FrameLabel text={eyebrow} subtle />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-50 md:text-[2rem]">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-stone-400 lg:text-right">
          {description}
        </p>
      </div>
    </div>
  );
}

export function FineDivider() {
  return (
    <div className="relative h-8 w-full overflow-hidden">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-300/35 bg-[#171310]" />
    </div>
  );
}

export function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[34px] border border-stone-800/80"
      style={{
        backgroundImage: historyTheme.gradient.hero,
        boxShadow: historyTheme.shadow.hero,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(217,119,6,0.12),transparent_22%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.05),transparent_20%)]" />
      <GrainOverlay dense />
      <div className="relative">{children}</div>
    </div>
  );
}

export function HeroGrid({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 p-6 md:grid-cols-[1.08fr_0.92fr] md:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-8">{left}</div>
      <div>{right}</div>
    </div>
  );
}

export function PrimaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <AppLink
      href={href}
      className="group inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-5 py-3 text-sm font-medium text-amber-50 transition hover:bg-amber-300/18"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
    </AppLink>
  );
}

export function SecondaryAction({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <AppLink
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-5 py-3 text-sm font-medium text-stone-200 transition hover:border-stone-600 hover:bg-stone-900"
    >
      {children}
    </AppLink>
  );
}

export function InfoPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FeaturePanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[30px] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(120,113,108,0.22),rgba(28,25,23,0.35))] p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ArchivePanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[32px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,248,235,0.06),rgba(255,248,235,0.02))] p-6 md:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  note,
  featured = false,
}: {
  label: string;
  value: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border p-4",
        featured
          ? "border-amber-300/30 bg-amber-300/10 shadow-[0_18px_40px_rgba(120,53,15,0.14)]"
          : "border-stone-800 bg-stone-950/75",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className={cn("text-xs", featured ? "text-amber-100/75" : "text-stone-500")}>
        {label}
      </div>
      <div
        className={cn(
          "mt-3 font-semibold tracking-[-0.04em] text-stone-50",
          featured ? "text-3xl md:text-4xl" : "text-3xl",
        )}
      >
        {value}
      </div>
      <div className={cn("mt-3 text-xs", featured ? "text-stone-300" : "text-stone-500")}>
        {note}
      </div>
    </div>
  );
}

export function FilterChip({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
          : "border-stone-700 bg-black/15 text-stone-300 hover:border-stone-600 hover:text-stone-100",
      )}
    >
      {label}
    </button>
  );
}

export function TimelineNode({
  title,
  subtitle,
  active = false,
  badge,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-[96px] rounded-[22px] border px-4 py-3 transition",
        active
          ? "border-amber-300/35 bg-amber-300/10 shadow-[0_0_50px_rgba(217,119,6,0.08)]"
          : "border-stone-800 bg-stone-950/45 hover:border-stone-700",
      )}
    >
      <div
        className={cn(
          "mb-3 h-1 w-10 rounded-full",
          active ? "bg-amber-300/70" : "bg-stone-700",
        )}
      />
      {badge ? (
        <div className="absolute right-3 top-3 rounded-full border border-amber-300/15 bg-amber-300/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-amber-100">
          {badge}
        </div>
      ) : null}
      <div
        className={cn(
          "text-base leading-tight break-keep",
          badge && "pr-14",
          active ? "font-medium text-stone-50" : "text-stone-200",
        )}
      >
        <span className="line-clamp-2">{title}</span>
      </div>
      <div
        className={cn(
          "mt-1.5 text-sm leading-tight",
          active ? "text-amber-100/85" : "text-stone-500",
        )}
      >
        <span className="line-clamp-2">{subtitle}</span>
      </div>
    </div>
  );
}

export function StepCard({
  no,
  title,
  subtitle,
  meta,
  description,
  href,
  cta,
  last = false,
  featured = false,
  quiet = false,
}: {
  no: string;
  title: string;
  subtitle: string;
  meta: string;
  description: string;
  href: string;
  cta: string;
  last?: boolean;
  featured?: boolean;
  quiet?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-6",
        featured
          ? "border-amber-300/30 bg-amber-300/10 shadow-[0_18px_50px_rgba(120,53,15,0.14)]"
          : quiet
            ? "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.012))]"
            : "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))]",
      )}
    >
      {!last && (
        <div className="absolute -right-4 top-1/2 hidden h-px w-8 -translate-y-1/2 bg-gradient-to-r from-stone-600 to-transparent lg:block" />
      )}
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">{no}</div>
      </div>
      {featured ? (
        <div className="mt-4 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-100">
          지금 시작
        </div>
      ) : null}
      <div className="mt-5 space-y-2">
        <div className="text-xl font-medium text-stone-50">{title}</div>
        <div className="text-sm leading-6 text-stone-300">{subtitle}</div>
      </div>
      <div className="mt-5 inline-flex rounded-full border border-stone-700 bg-black/20 px-3 py-1 text-xs text-stone-300">
        {meta}
      </div>
      <p className="mt-5 text-sm leading-7 text-stone-400">{description}</p>
      <AppLink
        href={href}
        className={cn(
          "mt-8 inline-flex items-center gap-2 text-sm font-medium transition",
          featured
            ? "text-amber-50 hover:text-amber-100"
            : quiet
              ? "text-stone-300 hover:text-stone-100"
              : "text-amber-100 hover:text-amber-50",
        )}
      >
        {cta}
        <ChevronRight className="h-4 w-4" />
      </AppLink>
    </div>
  );
}

export function FlowPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-stone-200">
      {items.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          <span className="rounded-full border border-stone-700 bg-black/15 px-3 py-2">
            {item}
          </span>
          {index < items.length - 1 && <ArrowRight className="h-4 w-4 text-stone-600" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function RecordCard({
  topLabel,
  topBadge,
  eyebrow,
  subEyebrow,
  title,
  lead,
  sections,
  footerHref,
  footerLabel,
  featured = false,
  titleClassName,
}: {
  topLabel: React.ReactNode;
  topBadge?: React.ReactNode;
  eyebrow?: string;
  subEyebrow?: string;
  title: string;
  lead?: string;
  sections?: React.ReactNode;
  footerHref?: string;
  footerLabel?: string;
  featured?: boolean;
  titleClassName?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[30px] border p-6 transition duration-300",
        featured
          ? "border-amber-300/30 bg-[linear-gradient(180deg,rgba(217,119,6,0.12),rgba(255,255,255,0.02))] shadow-[0_18px_60px_rgba(120,53,15,0.16)]"
          : "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] hover:border-stone-700",
      )}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-amber-300/35 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="mb-6 flex items-center justify-between gap-4">
        {topLabel}
        {topBadge}
      </div>
      {(eyebrow || subEyebrow) && (
        <div className="space-y-1">
          {eyebrow ? <div className="text-sm text-stone-400">{eyebrow}</div> : null}
          {subEyebrow ? <div className="text-sm text-amber-100/85">{subEyebrow}</div> : null}
        </div>
      )}
      <h3
        className={cn(
          "mt-5 text-[1.6rem] font-semibold tracking-[-0.04em] text-stone-50",
          titleClassName,
        )}
      >
        {title}
      </h3>
      {lead ? <div className="mt-4 text-sm text-amber-100/90">{lead}</div> : null}
      {sections ? <div className="mt-6 space-y-5">{sections}</div> : null}
      {footerHref && footerLabel ? (
        <AppLink
          href={footerHref}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-stone-100 transition group-hover:text-amber-100"
        >
          {footerLabel}
          <ChevronRight className="h-4 w-4" />
        </AppLink>
      ) : null}
    </div>
  );
}

export function MetaBox({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-stone-800 bg-black/10 p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-lg font-medium",
          emphasis ? "text-amber-100" : "text-stone-100",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function TextBlock({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-stone-800 p-4",
        emphasis ? "border-amber-300/15 bg-amber-300/5" : "bg-black/20",
      )}
    >
      <div className="text-xs text-stone-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-sm leading-7",
          emphasis ? "text-amber-50" : "text-stone-200",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function ArchiveRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emphasis";
}) {
  return (
    <div className="grid gap-2 border-b border-stone-800/80 py-4 last:border-b-0 md:grid-cols-[140px_1fr] md:gap-5">
      <div className="text-xs uppercase tracking-[0.22em] text-stone-500">{label}</div>
      <div
        className={cn(
          "text-sm leading-7",
          tone === "emphasis" ? "text-stone-100" : "text-stone-300",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function BottomRouteNav({
  items,
}: {
  items: Array<{ label: string; href: string; active?: boolean }>;
}) {
  return (
    <footer
      className="pointer-events-none fixed inset-x-0 z-40 mt-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between rounded-full border border-stone-800/90 bg-[#0f0f11]/90 px-3 py-2 shadow-[0_15px_50px_rgba(0,0,0,0.4)] backdrop-blur">
        {items.map((item) => (
          <AppLink
            key={item.label}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm transition",
              item.active
                ? "bg-amber-300/12 text-amber-100"
                : "text-stone-400 hover:bg-stone-900 hover:text-stone-200",
            )}
          >
            {item.label}
          </AppLink>
        ))}
      </div>
    </footer>
  );
}
