"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { resolveEraTheme } from "@/lib/theme/era";

interface WeakTopicCardProps {
  topic: string;
  index: number;
  connectionFlow: string;
  reason: string;
}

export function WeakTopicCard({
  topic,
  index,
  connectionFlow,
  reason,
}: WeakTopicCardProps) {
  const theme = resolveEraTheme(topic);

  return (
    <Link
      href="/notes"
      className="os-weak-card group"
      style={{ borderLeftColor: theme.palette.accent }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="os-priority-index">{index + 1}순위</span>
            <span className="os-era-chip" style={{ color: theme.palette.accent }}>
              {theme.label}
            </span>
          </div>

          <h3 className="os-card-title mt-3">{topic}</h3>
          <p className="os-connection-flow mt-3">{connectionFlow}</p>
          <p className="os-body mt-2">{reason}</p>
        </div>

        <ArrowRight
          size={16}
          className="shrink-0 text-[var(--os-text-tertiary)] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
