"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookCheck,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Landmark,
  RefreshCcw,
  ScrollText,
  Sparkles,
} from "lucide-react";
import {
  AppLink,
  ArchivePanel,
  BottomRouteNav,
  FeaturePanel,
  FilterChip,
  FlowPills,
  FrameLabel,
  HeroGrid,
  HeroShell,
  HistoryPageShell,
  InfoPanel,
  MetaBox,
  MotionSection,
  PrimaryAction,
  RecordCard,
  SectionTitle,
  SecondaryAction,
  StatTile,
  StepCard,
  TextBlock,
  FineDivider,
} from "@/components/history-ui/primitives";
import { getReviewQueue } from "@/lib/api/review";
import { getCurrentUserId } from "@/lib/auth";
import { resolveDominantEraTheme, resolveEraTheme } from "@/lib/theme/era";
import { ReviewQueueItem } from "@/lib/types/api";

type Stat = { label: string; value: string; note: string };
type QueueFilter = { label: string; active?: boolean };
type ReviewItem = {
  id: string;
  queueId: string;
  questionId: string;
  era: string;
  type: string;
  title: string;
  prompt: string;
  due: string;
  strength: string;
  memoryPoint: string;
  flow: string[];
  reason: string;
  featured?: boolean;
};
type RecoveryStep = {
  no: string;
  title: string;
  subtitle: string;
  meta: string;
  description: string;
  href: string;
  cta: string;
};
type NavItem = { label: string; href: string; active?: boolean };

type ReviewPageData = {
  hero: {
    title: string;
    subtitle: string;
    era: string;
    axis: string;
    description: string;
    stats: Stat[];
  };
  filters: QueueFilter[];
  todayFocus: {
    title: string;
    description: string;
    chips: string[];
  };
  recoverySteps: RecoveryStep[];
  reviewQueue: ReviewItem[];
  archive: {
    title: string;
    description: string;
    carryOut: string[];
    nextActionTitle: string;
    nextActionDescription: string;
    nextHref: string;
  };
  bottomNav: NavItem[];
};

const DEFAULT_BOTTOM_NAV: NavItem[] = [
  { label: "오늘", href: "/today" },
  { label: "학습", href: "/solve" },
  { label: "오답", href: "/notes" },
  { label: "복습", href: "/review", active: true },
];

const DEFAULT_RECOVERY_STEPS: RecoveryStep[] = [
  {
    no: "01",
    title: "흐름 다시 보기",
    subtitle: "기억 포인트를 먼저 가볍게 확인",
    meta: "빠른 회복",
    description:
      "오답노트에서 남겨 둔 기억 문장을 먼저 읽고, 왜 틀렸는지의 구조를 다시 떠올립니다.",
    href: "/notes",
    cta: "오답노트 확인",
  },
  {
    no: "02",
    title: "짧게 되묻기",
    subtitle: "핵심 질문으로 다시 확인",
    meta: "직접 점검",
    description:
      "문장을 통째로 외우지 말고, 핵심 연결을 스스로 설명할 수 있는지 짧게 되묻습니다.",
    href: "/review",
    cta: "복습 시작",
  },
  {
    no: "03",
    title: "다음 문제로 이동",
    subtitle: "회복한 기억을 바로 적용",
    meta: "실전 전환",
    description:
      "회복이 끝난 흐름은 곧바로 다음 문제에 연결해 기억이 실제 판단으로 이어지게 만듭니다.",
    href: "/solve",
    cta: "문제로 넘어가기",
  },
];

function shorten(text: string | null | undefined, max = 44) {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function dedupe<T>(items: T[]) {
  return Array.from(new Set(items));
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isDueNow(iso: string) {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  return startOfDay(due).getTime() <= startOfDay(new Date()).getTime();
}

function formatDueLabel(iso: string) {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "예정";

  const diffDays = Math.round(
    (startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / 86400000,
  );

  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "내일";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(due);
}

function deriveFlow(item: ReviewQueueItem) {
  const theme = resolveEraTheme([item.question_stem, item.memory_hint ?? ""]);
  const parsed = (item.memory_hint ?? "")
    .split(/->|→|,|\/|\||·|=/)
    .map((token) => token.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((token, index, arr) => arr.indexOf(token) === index);

  if (parsed.length >= 2) {
    return parsed.slice(0, 4);
  }

  return [theme.label, item.error_type || "기억 포인트", item.memory_hint || "다시 설명하기"]
    .map((token) => token.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function deriveStrength(item: ReviewQueueItem) {
  if (item.review_count <= 0) return "흐름 회복 필요";
  if (item.review_count === 1) return "한 번 더 확인";
  return "안정화 점검";
}

function deriveReason(item: ReviewQueueItem) {
  const theme = resolveEraTheme([item.question_stem, item.memory_hint ?? ""]);

  if (item.review_count <= 0) {
    return `${theme.label} 구간에서 ${item.error_type || "기억 흔들림"}이 남아 있어, 이번 회독에서 먼저 다시 설명형으로 되물어 볼 필요가 있습니다.`;
  }

  if (item.review_count === 1) {
    return `${item.memory_hint ? "기억 문장" : "핵심 연결"}을 한 번 더 꺼내 확인하면 같은 유형의 흔들림을 줄이는 데 도움이 됩니다.`;
  }

  return `${item.error_type || "핵심 연결"}을 다음 문제에 적용하기 전에 짧게 점검해 두면 기억이 더 오래 남습니다.`;
}

function buildReviewPageData(queue: ReviewQueueItem[]): ReviewPageData {
  const dominantTheme = resolveDominantEraTheme(
    queue.map((item) => `${item.question_stem} ${item.memory_hint ?? ""}`),
  );
  const featuredIndex = Math.max(queue.findIndex((item) => isDueNow(item.due_at)), 0);

  const transformedQueue: ReviewItem[] = queue.map((item, index) => {
    const theme = resolveEraTheme([item.question_stem, item.memory_hint ?? ""]);

    return {
      id: `Queue ${String(index + 1).padStart(2, "0")}`,
      queueId: item.queue_id,
      questionId: item.question_id,
      era: theme.label,
      type: isDueNow(item.due_at) ? "우선 회복" : "확인 복습",
      title: shorten(item.question_stem, 36) || "다시 확인할 복습 항목",
      prompt:
        item.memory_hint ||
        item.question_stem ||
        "핵심 연결을 스스로 설명할 수 있는지 짧게 점검합니다.",
      due: formatDueLabel(item.due_at),
      strength: deriveStrength(item),
      memoryPoint:
        item.memory_hint ||
        "이번 복습에서 다시 남겨 둘 기억 포인트를 짧게 정리합니다.",
      flow: deriveFlow(item),
      reason: deriveReason(item),
      featured: index === featuredIndex,
    };
  });

  const uniqueEras = dedupe(transformedQueue.map((item) => item.era));
  const dueNowCount = queue.filter((item) => isDueNow(item.due_at)).length;
  const memoryPointCount = dedupe(transformedQueue.map((item) => item.memoryPoint).filter(Boolean)).length;
  const repeatedRate =
    queue.length > 0
      ? `${Math.round((queue.filter((item) => item.review_count > 0).length / queue.length) * 100)}%`
      : "0%";

  const primaryFocus = transformedQueue[0];
  const secondaryFocus = transformedQueue[1];
  const carryOut = dedupe(
    transformedQueue.flatMap((item) => [item.memoryPoint, item.flow.join(" -> ")]).filter(Boolean),
  ).slice(0, 3);

  return {
    hero: {
      title: "회복실",
      subtitle: "다시 꺼내 확인하는 흐름",
      era: dominantTheme.label,
      axis: transformedQueue[0]?.type || "흐름 회복",
      description:
        "복습은 정답을 맞히는 시간이 아니라, 끊겼던 연결을 다시 꺼내 확인해 기억의 힘을 회복하는 시간입니다. 오늘은 선명하게 남겨야 할 흐름부터 다시 묻고, 흔들리는 연결은 바로잡아 둡니다.",
      stats: [
        { label: "오늘 복습 큐", value: String(queue.length), note: "지금 확인할 것" },
        { label: "우선 회복", value: String(dueNowCount), note: "흔들림 강함" },
        { label: "기억 포인트", value: String(memoryPointCount), note: "다시 남길 것" },
        { label: "다시 맞히기", value: repeatedRate, note: "반복 회독 기준" },
      ],
    },
    filters: [
      { label: "전체", active: true },
      { label: "우선 회복" },
      ...uniqueEras.slice(0, 3).map((label) => ({ label })),
    ],
    todayFocus: {
      title: "오늘 먼저 되묻는 흐름",
      description:
        primaryFocus && secondaryFocus
          ? `${primaryFocus.era} ${primaryFocus.title}를 중심으로 ${secondaryFocus.era} 구간까지 함께 다시 확인합니다. 문제를 다시 푸는 것보다, 어떤 연결이 흔들렸는지 설명형으로 복기하는 데 초점을 둡니다.`
          : primaryFocus
            ? `${primaryFocus.era} 흐름을 먼저 다시 확인합니다. 지금 회독에서는 정답보다 기억 문장이 다시 떠오르는지가 더 중요합니다.`
            : "복습 큐가 쌓이면 이곳에서 오늘 먼저 되묻는 흐름을 바로 확인할 수 있습니다.",
      chips:
        uniqueEras.length > 0
          ? [...uniqueEras.slice(0, 2), `기억 포인트 ${Math.max(memoryPointCount, 1)}개`]
          : ["복습 준비", "기억 포인트 0개"],
    },
    recoverySteps: DEFAULT_RECOVERY_STEPS,
    reviewQueue: transformedQueue,
    archive: {
      title: "복습 후 남길 것",
      description:
        "복습은 끝나는 순간 사라지지 않도록, 이번 회독에서 회복한 연결을 짧은 문장으로 다시 남겨 두는 것이 중요합니다.",
      carryOut:
        carryOut.length > 0
          ? carryOut
          : ["오답에서 남긴 기억 문장을 복습 큐와 함께 다시 확인하기"],
      nextActionTitle: "문제로 바로 이어 보기",
      nextActionDescription:
        "회복한 기억은 곧바로 문제에 적용할 때 가장 오래 남습니다. 지금 복습한 흐름을 다음 학습 문제로 이어 보세요.",
      nextHref: "/solve",
    },
    bottomNav: DEFAULT_BOTTOM_NAV,
  };
}

function ReviewQueueCard({ item }: { item: ReviewItem }) {
  return (
    <RecordCard
      topLabel={<FrameLabel icon={<ScrollText className="h-3.5 w-3.5" />} text={item.id} subtle />}
      topBadge={item.featured ? <FrameLabel text="우선 회복" /> : undefined}
      eyebrow={item.era}
      subEyebrow={item.type}
      title={item.title}
      featured={item.featured}
      sections={
        <>
          <p className="text-sm leading-7 text-stone-300">{item.prompt}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <MetaBox
              label="복습 시점"
              value={
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-amber-200" />
                  {item.due}
                </span>
              }
            />
            <MetaBox label="현재 상태" value={item.strength} emphasis />
          </div>
          <TextBlock label="왜 다시 보나" value={item.reason} />
          <TextBlock label="회복할 흐름" value={<FlowPills items={item.flow} />} />
          <TextBlock label="기억 포인트" value={item.memoryPoint} emphasis />
          <div className="flex flex-wrap gap-3">
            <AppLink
              href={`/solve?mode=review&queue=${item.queueId}&question=${item.questionId}`}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-300/18"
            >
              복습 시작
              <RefreshCcw className="h-4 w-4" />
            </AppLink>
            <AppLink
              href="/notes"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-400 transition hover:text-stone-200"
            >
              오답노트 다시 보기
              <ScrollText className="h-4 w-4" />
            </AppLink>
          </div>
        </>
      }
    />
  );
}

function HeroSection({ hero }: { hero: ReviewPageData["hero"] }) {
  return (
    <MotionSection>
      <HeroShell>
        <HeroGrid
          left={
            <>
              <div className="flex flex-col gap-6">
                <FrameLabel icon={<Landmark className="h-4 w-4 text-amber-300/70" />} text={hero.title} />
                <div className="space-y-4">
                  <div className="text-sm tracking-[0.2em] text-stone-400">{hero.subtitle}</div>
                  <div className="flex flex-wrap items-end gap-4">
                    <h1 className="text-4xl font-semibold tracking-[-0.05em] text-stone-50 md:text-6xl">
                      {hero.era}
                    </h1>
                    <span className="pb-1 text-base tracking-[0.16em] text-amber-100/85 md:text-lg">
                      {hero.axis}
                    </span>
                  </div>
                  <div className="max-w-2xl text-sm leading-7 text-stone-400 md:text-base">
                    {hero.description}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryAction href="/review">복습 시작</PrimaryAction>
                <SecondaryAction href="/notes">
                  <BookOpen className="h-4 w-4" />
                  오답노트 보기
                </SecondaryAction>
              </div>
            </>
          }
          right={
            <InfoPanel className="border-stone-800/90 bg-black/20 p-5 shadow-inner shadow-black/30">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">복습 현황</div>
                  <div className="mt-2 text-lg font-medium text-stone-100">오늘 다시 확인할 연결</div>
                </div>
                <div className="rounded-full border border-amber-300/20 bg-amber-300/10 p-2.5 text-amber-200">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {hero.stats.map((stat) => (
                  <StatTile key={stat.label} {...stat} />
                ))}
              </div>
            </InfoPanel>
          }
        />
      </HeroShell>
    </MotionSection>
  );
}

function QueueOverviewSection({ filters, todayFocus }: Pick<ReviewPageData, "filters" | "todayFocus">) {
  return (
    <MotionSection delay={0.08} className="relative">
      <SectionTitle
        eyebrow="복습 큐"
        title="오늘 먼저 되묻는 연결"
        description="복습은 모든 것을 다시 보는 것이 아니라, 흔들림이 큰 흐름부터 다시 꺼내는 작업입니다."
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <InfoPanel className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">큐 필터</div>
              <div className="mt-2 text-lg font-medium text-stone-100">우선순위 보기</div>
            </div>
            <div className="rounded-full border border-stone-700 bg-black/15 p-2 text-stone-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <FineDivider />
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <FilterChip key={item.label} label={item.label} active={item.active} />
            ))}
          </div>
        </InfoPanel>

        <FeaturePanel className="p-6">
          <FrameLabel text="오늘의 복습 기준" />
          <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-50">{todayFocus.title}</h3>
          <p className="mt-4 text-sm leading-7 text-stone-300">{todayFocus.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-stone-300">
            {todayFocus.chips.map((chip) => (
              <span key={chip} className="rounded-full border border-stone-700 bg-black/15 px-3 py-1">
                {chip}
              </span>
            ))}
          </div>
        </FeaturePanel>
      </div>
    </MotionSection>
  );
}

function RecoveryFlowSection({ recoverySteps }: Pick<ReviewPageData, "recoverySteps">) {
  return (
    <MotionSection delay={0.16} className="relative">
      <SectionTitle
        eyebrow="회복 순서"
        title="복습을 학습 행동으로 잇기"
        description="기억을 다시 꺼내고, 짧게 확인하고, 곧바로 적용하는 흐름으로 복습이 끝나지 않게 만듭니다."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {recoverySteps.map((step, index) => (
          <StepCard key={step.no} {...step} last={index === recoverySteps.length - 1} />
        ))}
      </div>
    </MotionSection>
  );
}

function ReviewQueueSection({ reviewQueue }: Pick<ReviewPageData, "reviewQueue">) {
  return (
    <MotionSection delay={0.25} className="relative">
      <SectionTitle
        eyebrow="되묻는 기록"
        title="오늘의 복습 항목"
        description="문제를 다시 푸는 것보다, 무엇이 끊겼고 어떤 문장으로 회복해야 하는지를 먼저 확인하는 구조입니다."
      />

      {reviewQueue.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {reviewQueue.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <ReviewQueueCard item={item} />
            </motion.div>
          ))}
        </div>
      ) : (
        <InfoPanel className="rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-8 text-center">
          <div className="mx-auto inline-flex rounded-full border border-stone-700 bg-black/20 p-3 text-stone-300">
            <ScrollText className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
            아직 복습 큐가 비어 있습니다
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-400">
            새로운 오답이나 회독 항목이 생기면 이곳에서 회복할 흐름과 기억 포인트를 함께 확인할 수 있습니다.
          </p>
        </InfoPanel>
      )}
    </MotionSection>
  );
}

function ArchiveSection({ archive }: Pick<ReviewPageData, "archive">) {
  return (
    <MotionSection delay={0.34} className="relative">
      <SectionTitle
        eyebrow="회복 보관층"
        title="복습 후 남길 것"
        description="복습이 끝나도 남는 문장과 연결이 있어야 다음 문제에서 흔들리지 않습니다."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ArchivePanel>
          <FrameLabel icon={<BookCheck className="h-3.5 w-3.5" />} text="회복 인덱스" subtle />
          <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-stone-50">{archive.title}</h3>
          <p className="mt-4 text-sm leading-7 text-stone-300">{archive.description}</p>
          <div className="mt-6 space-y-3">
            {archive.carryOut.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-stone-800 bg-black/15 px-4 py-3 text-sm text-stone-200"
              >
                {item}
              </div>
            ))}
          </div>
        </ArchivePanel>

        <FeaturePanel className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(217,119,6,0.12),transparent_30%)]" />
          <div className="relative">
            <FrameLabel text="다음 행동" />
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-stone-50">
              {archive.nextActionTitle}
            </h3>
            <p className="mt-4 text-sm leading-7 text-stone-300">{archive.nextActionDescription}</p>
            <PrimaryAction href={archive.nextHref}>문제로 이어 가기</PrimaryAction>
          </div>
        </FeaturePanel>
      </div>
    </MotionSection>
  );
}

function ReviewLoadingState() {
  return (
    <HistoryPageShell>
      <div className="h-[320px] animate-pulse rounded-[34px] border border-stone-800 bg-stone-950/50" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[220px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[220px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[480px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[480px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
      </div>
    </HistoryPageShell>
  );
}

export function ReviewExperience() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getCurrentUserId();

  useEffect(() => {
    let mounted = true;

    const fetchQueue = async () => {
      try {
        const data = await getReviewQueue(userId, true);
        if (mounted) {
          setQueue(data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchQueue();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const pageData = useMemo(() => buildReviewPageData(queue), [queue]);

  if (loading) {
    return <ReviewLoadingState />;
  }

  return (
    <HistoryPageShell>
      <HeroSection hero={pageData.hero} />
      <QueueOverviewSection filters={pageData.filters} todayFocus={pageData.todayFocus} />
      <RecoveryFlowSection recoverySteps={pageData.recoverySteps} />
      <ReviewQueueSection reviewQueue={pageData.reviewQueue} />
      <ArchiveSection archive={pageData.archive} />
      <BottomRouteNav items={pageData.bottomNav} />
    </HistoryPageShell>
  );
}
