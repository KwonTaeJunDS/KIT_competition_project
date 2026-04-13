"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { TodayData } from "@/lib/types/api";
import { buildEraTimeline } from "@/lib/today/eraTimeline";
import { resolveEraTheme } from "@/lib/theme/era";
import { HISTORY_DESK_ERA_REFERENCES } from "@/lib/theme/historyDeskReference";

interface HistoryTimelineProps {
  todayData: TodayData;
}

export function HistoryTimeline({ todayData }: HistoryTimelineProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const items = buildEraTimeline(todayData);
  const primaryKey = todayData.weak_topics[0]
    ? resolveEraTheme(todayData.weak_topics[0]).key
    : null;

  const weakTopicsByEra = useMemo(() => {
    return todayData.weak_topics.reduce(
      (map, topic) => {
        const theme = resolveEraTheme(topic);
        const current = map.get(theme.key) ?? [];
        current.push(topic);
        map.set(theme.key, current);
        return map;
      },
      new Map<string, string[]>(),
    );
  }, [todayData.weak_topics]);

  const focusItems = items.filter((item) => weakTopicsByEra.has(item.theme.key));
  const secondaryKeys = focusItems
    .filter((item) => item.theme.key !== primaryKey)
    .map((item) => item.theme.key);
  const activeKey = expandedKey ?? primaryKey ?? focusItems[0]?.theme.key ?? null;
  const activeItem = items.find((item) => item.theme.key === activeKey) ?? null;
  const activeTopics = activeItem ? weakTopicsByEra.get(activeItem.theme.key) ?? [] : [];

  return (
    <section className="os-panel os-timeline-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="os-kicker">시대 지도</div>
          <h2 className="os-section-title mt-2">오늘의 시대 지도</h2>
          <p className="os-body mt-2 max-w-2xl">
            오늘은 <span className="text-[var(--os-text-primary)]">{items.find((item) => item.theme.key === primaryKey)?.theme.label ?? "집중 구간"}</span>를
            중심으로 보고, 나머지 연결 구간은 낮은 강도로 따라옵니다.
          </p>
        </div>

        <div className="os-inline-stats">
          <div className="os-stat-chip">
            <span className="os-metric-label">Primary</span>
            <span className="os-metric-inline">{items.find((item) => item.theme.key === primaryKey)?.theme.label ?? "-"}</span>
          </div>
          <div className="os-stat-chip">
            <span className="os-metric-label">Secondary</span>
            <span className="os-metric-inline font-mono">{secondaryKeys.length}</span>
          </div>
          <div className="os-stat-chip">
            <span className="os-metric-label">전체 시대</span>
            <span className="os-metric-inline font-mono">{items.length}</span>
          </div>
        </div>
      </div>

      <div className="os-timeline-map mt-6">
        {items.map((item) => {
          const reference =
            item.theme.key !== "unknown"
              ? HISTORY_DESK_ERA_REFERENCES[item.theme.key]
              : null;
          const isPrimary = item.theme.key === primaryKey;
          const isSecondary = secondaryKeys.includes(item.theme.key);
          const isActive = activeKey === item.theme.key;

          return (
            <button
              key={item.theme.key}
              type="button"
              onClick={() => setExpandedKey(item.theme.key)}
              className={`os-timeline-node ${isPrimary ? "primary" : ""} ${isSecondary ? "secondary" : ""} ${isActive ? "active" : ""}`}
              style={{ ["--node-accent" as string]: reference?.accent ?? item.theme.palette.accent }}
            >
              <span className="os-timeline-label">{item.theme.label}</span>
              <span className="os-timeline-maplabel">
                {reference?.mapLabel ?? "정리"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {focusItems.map((item) => {
          const reference =
            item.theme.key !== "unknown"
              ? HISTORY_DESK_ERA_REFERENCES[item.theme.key]
              : null;
          const topics = weakTopicsByEra.get(item.theme.key) ?? [];
          const isPrimary = item.theme.key === primaryKey;
          const isActive = activeKey === item.theme.key;

          return (
            <button
              key={item.theme.key}
              type="button"
              onClick={() => setExpandedKey(item.theme.key)}
              className={`os-focus-zone-card ${isActive ? "active" : ""} ${isPrimary ? "primary" : ""}`}
              style={{ ["--node-accent" as string]: reference?.accent ?? item.theme.palette.accent }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="os-kicker">{isPrimary ? "Primary Era" : "Secondary Era"}</div>
                  <h3 className="os-card-title mt-2">{item.theme.label}</h3>
                </div>
                <span className="os-era-chip" style={{ color: reference?.accent ?? item.theme.palette.accent }}>
                  {reference?.mapLabel ?? "집중"}
                </span>
              </div>

              <p className="os-body mt-3">{reference?.narrative ?? item.theme.summary}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="os-section-meta">연결 주제 {topics.length}개</span>
                <span className="os-link-inline">
                  자세히 보기
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isActive ? "rotate-180" : ""}`}
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeItem ? (
          <motion.div
            key={activeItem.theme.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="os-timeline-detail"
            style={{
              borderLeftColor:
                activeItem.theme.key !== "unknown"
                  ? HISTORY_DESK_ERA_REFERENCES[activeItem.theme.key].accent
                  : activeItem.theme.palette.accent,
            }}
          >
            <div>
              <div className="os-kicker">
                {activeItem.theme.key === primaryKey ? "오늘 중심 구간" : "다음 연결 구간"}
              </div>
              <h3 className="os-card-title mt-2">{activeItem.theme.label}</h3>
              <p className="os-body mt-2">
                {activeItem.theme.key !== "unknown"
                  ? HISTORY_DESK_ERA_REFERENCES[activeItem.theme.key].flowSummary
                  : activeItem.theme.summary}
              </p>
            </div>

            <div>
              <div className="os-kicker">지도 라벨</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="os-detail-chip">
                  {activeItem.theme.key !== "unknown"
                    ? HISTORY_DESK_ERA_REFERENCES[activeItem.theme.key].mapLabel
                    : "정리"}
                </span>
                <span className="os-detail-chip">{activeItem.rangeLabel}</span>
              </div>
            </div>

            <div>
              <div className="os-kicker">연결 주제</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeTopics.length > 0 ? (
                  activeTopics.map((topic) => (
                    <span key={topic} className="os-detail-chip">
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="os-detail-chip">직접 연결된 취약 주제 없음</span>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
