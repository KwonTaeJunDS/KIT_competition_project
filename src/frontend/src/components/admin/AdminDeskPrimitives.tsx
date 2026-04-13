"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const adminDeskTheme = {
  colors: {
    bg: "#0b0b0d",
    bgSoft: "#111111",
    ink: "#f5f5f4",
    inkMuted: "#a8a29e",
    line: "rgba(68,64,60,0.8)",
    lineSoft: "rgba(87,83,78,0.65)",
    paper: "rgba(255,255,255,0.04)",
    paperWarm: "rgba(255,248,235,0.06)",
    amber: "#d97706",
    gold: "#c9a96b",
    amberSoft: "rgba(217,119,6,0.12)",
    amberGlow: "rgba(217,119,6,0.16)",
    goldSoft: "rgba(201,169,107,0.12)",
    goldBorder: "#6f5932",
    danger: "#d98b7b",
    dangerSoft: "rgba(217,139,123,0.12)",
    dangerBorder: "#6a352d",
    warn: "#d8b36a",
    warnSoft: "rgba(216,179,106,0.12)",
    warnBorder: "#6a5730",
    ok: "#8db7a3",
    okSoft: "rgba(141,183,163,0.12)",
    okBorder: "#355247",
    rose: "rgba(244,63,94,0.12)",
    blue: "rgba(59,130,246,0.12)",
    emerald: "rgba(16,185,129,0.12)",
  },
  radius: {
    shell: "32px",
    panel: "30px",
    card: "22px",
    chip: "999px",
  },
  shadow: {
    panel: "0 18px 34px rgba(0,0,0,0.28)",
    hero: "0 30px 100px rgba(0,0,0,0.45)",
    soft: "0 14px 26px rgba(0,0,0,0.22)",
    floating: "0 18px 60px rgba(0,0,0,0.28)",
  },
  gradient: {
    hero:
      "linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))",
    panel:
      "linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))",
    soft:
      "linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))",
    feature:
      "linear-gradient(180deg,rgba(120,113,108,0.22),rgba(28,25,23,0.35))",
    archive:
      "linear-gradient(180deg,rgba(255,248,235,0.06),rgba(255,248,235,0.02))",
  },
} as const;

export function AdminMotionSection({
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function AdminFrameLabel({
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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em]",
        subtle
          ? "border-stone-700/80 bg-black/20 text-stone-400 backdrop-blur"
          : "border-amber-300/20 bg-amber-300/10 text-amber-100/90 backdrop-blur",
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

export function AdminSectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminFrameLabel text={eyebrow} subtle />
        {action}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-myeongjo text-[28px] font-bold tracking-[-0.04em] text-stone-50">
          {title}
        </h2>
        <p className="max-w-3xl text-[14px] leading-7 text-stone-400">{description}</p>
      </div>
    </div>
  );
}

export function AdminPanel({
  children,
  className,
  tone = "default",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "hero" | "soft" | "feature" | "focus" | "warning" | "danger";
} & React.HTMLAttributes<HTMLElement>) {
  const toneClass =
    tone === "hero"
      ? "border-[#3a3328] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_100px_rgba(0,0,0,0.45)]"
      : tone === "focus"
        ? "border-[#6f5932] bg-[#171513] shadow-[0_0_0_1px_rgba(201,169,107,0.1),0_18px_34px_rgba(0,0,0,0.28)]"
        : tone === "warning"
          ? "border-[#6a5730] bg-[#191611] shadow-[0_18px_34px_rgba(0,0,0,0.28)]"
          : tone === "danger"
            ? "border-[#6a352d] bg-[#191212] shadow-[0_18px_34px_rgba(0,0,0,0.28)]"
      : tone === "soft"
        ? "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.014))] shadow-[0_14px_26px_rgba(0,0,0,0.22)]"
        : tone === "feature"
          ? "border-[#6f5932]/70 bg-[linear-gradient(180deg,rgba(120,113,108,0.22),rgba(28,25,23,0.35))] shadow-[0_18px_34px_rgba(0,0,0,0.28)]"
          : "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_18px_34px_rgba(0,0,0,0.28)]";

  return (
    <section
      {...props}
      className={cn(
        "relative overflow-hidden rounded-[30px] border px-5 py-5",
        toneClass,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,169,107,0.24),transparent)]" />
      <div className="pointer-events-none absolute left-0 top-0 h-10 w-10 rounded-tl-[30px] border-l border-t border-white/5" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-10 w-10 rounded-br-[30px] border-b border-r border-white/5" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 32px, rgba(255,255,255,0.04) 32px 33px)",
        }}
      />
      <div className="relative">{children}</div>
    </section>
  );
}

export function AdminMetricTile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "rose" | "amber" | "blue" | "emerald";
}) {
  const toneClass =
    tone === "rose"
      ? "border-[#6a352d] bg-[#241615]"
      : tone === "amber"
        ? "border-[#6a5730] bg-[#1b1712]"
        : tone === "blue"
          ? "border-[#44413b] bg-[#191919]"
          : tone === "emerald"
            ? "border-[#355247] bg-[#16211d]"
            : "border-stone-800 bg-black/20";

  return (
    <div className={cn("relative overflow-hidden rounded-[20px] border px-4 py-4", toneClass)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,169,107,0.18),transparent)]" />
      <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">{label}</div>
      <div className="mt-2 font-myeongjo text-[26px] font-bold tracking-[-0.04em] text-stone-50">{value}</div>
      <div className="mt-1 text-[12px] leading-5 text-stone-400">{detail}</div>
    </div>
  );
}

export function AdminChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warm" | "accent" | "danger" | "ok";
}) {
  const toneClass =
    tone === "warm"
      ? "border-stone-700 bg-black/15 text-stone-300"
      : tone === "accent"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : tone === "danger"
          ? "border-[#6a352d] bg-[#2a1715] text-[#d98b7b]"
          : tone === "ok"
            ? "border-[#355247] bg-[#18231f] text-[#8db7a3]"
        : "border-stone-700 bg-black/15 text-stone-300";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold", toneClass)}>
      {children}
    </span>
  );
}

export function AdminPrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#6f5932] bg-[#2b2419] px-4 text-[13px] font-semibold text-[#f3f1ea] transition-colors hover:bg-[#352c1d]",
        className,
      )}
    >
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}

export function AdminSecondaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-4 text-[13px] font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function AdminValueBox({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: "default" | "emphasis";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-4",
        tone === "emphasis"
          ? "border-amber-300/15 bg-amber-300/5"
          : "border-stone-800 bg-black/10",
      )}
    >
      <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">{label}</div>
      <div className="mt-2 text-[15px] font-semibold leading-7 tracking-[-0.02em] text-stone-100">
        {value}
      </div>
      {detail ? <div className="mt-2 text-[12px] leading-6 text-stone-400">{detail}</div> : null}
    </div>
  );
}

export function AdminTextBlock({
  label,
  children,
  tone = "default",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "default" | "emphasis";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-4",
        tone === "emphasis"
          ? "border-amber-300/15 bg-amber-300/5"
          : "border-stone-800 bg-black/20",
      )}
    >
      <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-[13px] leading-7",
          tone === "emphasis" ? "text-amber-50" : "text-stone-200",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminFlowPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-stone-200">
      {items.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          <span className="rounded-full border border-stone-700 bg-black/15 px-3 py-2 text-[12px] font-semibold text-stone-200">
            {item}
          </span>
          {index < items.length - 1 ? (
            <ArrowRight size={14} className="text-stone-600" />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function AdminSignalBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "danger" | "ok" | "accent";
}) {
  const toneClass =
    tone === "warning"
      ? "border-[#6a5730] bg-[#2b2318] text-[#d8b36a]"
      : tone === "danger"
        ? "border-[#6a352d] bg-[#2a1715] text-[#d98b7b]"
        : tone === "ok"
          ? "border-[#355247] bg-[#18231f] text-[#8db7a3]"
          : tone === "accent"
            ? "border-[#6f5932] bg-[#2b2419] text-[#c9a96b]"
            : "border-[#44413b] bg-[#1b1a18] text-[#c8c2b8]";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function AdminInfoBlock({
  label,
  children,
  mono = false,
  highlight = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-3",
        highlight
          ? "border-[#6f5932] bg-[#1a1712]"
          : "border-stone-800 bg-[#1a1a1d]",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 whitespace-pre-line text-sm leading-6 text-[#f3f1ea]",
          mono && "font-mono text-[13px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminActionConsole({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  tertiaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  tertiaryLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <AdminPrimaryLink href={primaryHref}>{primaryLabel}</AdminPrimaryLink>
        <AdminSecondaryLink href={secondaryHref}>{secondaryLabel}</AdminSecondaryLink>
      </div>
      {tertiaryLabel ? (
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-stone-400">
          {tertiaryLabel}
          <ChevronRight size={14} />
        </span>
      ) : null}
    </div>
  );
}
