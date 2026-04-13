"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getTodayData } from "@/lib/api/today";
import { getCurrentUserId } from "@/lib/auth";
import { TodayData } from "@/lib/types/api";
import {
  BookMarked,
  BookOpen,
  Landmark,
  ScrollText,
  Sparkles,
} from "lucide-react";
import {
  ArchivePanel,
  ArchiveRow,
  BottomRouteNav,
  FeaturePanel,
  FineDivider,
  FlowPills,
  FrameLabel,
  HeroGrid,
  HeroShell,
  HistoryPageShell,
  InfoPanel,
  MotionSection,
  PrimaryAction,
  RecordCard,
  SectionTitle,
  SecondaryAction,
  StatTile,
  StepCard,
  TextBlock,
  TimelineNode,
} from "@/components/history-ui/primitives";

type Metric = { label: string; value: string; note: string };
type TimelineItem = { name: string; sub: string; active?: boolean };
type ConnectedPeriod = {
  title: string;
  subtitle: string;
  years: string;
  description: string;
  note: string;
};
type FlowStep = {
  no: string;
  title: string;
  subtitle: string;
  meta: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
  quiet?: boolean;
};
type Chain = {
  id: string;
  era: string;
  axis: string;
  title: string;
  links: string[];
  exam: string;
  note: string;
  href: string;
  featured?: boolean;
};
type NavItem = { label: string; href: string; active?: boolean };

type TodayPageData = {
  hero: {
    title: string;
    subtitle: string;
    era: string;
    axis: string;
    years: string;
    oneLine: string;
    description: string;
    primaryMetric: Metric;
    sideMetrics: Metric[];
  };
  pointSummary: {
    reason: string;
    reasonDescription: string;
    artifact: string;
    artifactDescription: string;
  };
  timeline: TimelineItem[];
  todayFocus: {
    era: string;
    axis: string;
    description: string;
    chips: string[];
  };
  connectedPeriods: ConnectedPeriod[];
  flowSteps: FlowStep[];
  chains: Chain[];
  archive: {
    keySentence: string;
    artifact: string;
    examPoint: string;
    linkedFlow: string;
    nextLead: string;
    nextTitle: string;
    nextDescription: string;
    nextChips: string[];
    nextHref: string;
  };
  bottomNav: NavItem[];
};

const BASE_PAGE_DATA: TodayPageData = {
  hero: {
    title: "오늘의 장",
    subtitle: "오늘 복습으로 흐름 다지기",
    era: "일제강점기",
    axis: "침탈·저항",
    years: "1910 - 1945",
    oneLine: "침탈이 저항을 낳는 구간",
    description:
      "오늘은 끊긴 흐름을 다시 맞추고, 다음 회독에서 더 자연스럽게 이어지게 만드는 날입니다. 이어진 복습과 대표 연결을 먼저 훑으면서 이 시대의 감각을 다시 세웁니다.",
    primaryMetric: {
      label: "오늘 핵심",
      value: "끊긴 연결 3",
      note: "먼저 복원할 흐름",
    },
    sideMetrics: [
      { label: "먼저 볼 복습", value: "12", note: "흐름 회복 우선" },
      { label: "이어 볼 새 문제", value: "5", note: "개념 덧입히기" },
      { label: "오늘 학습량", value: "17", note: "오늘 진행 분량" },
    ],
  },
  pointSummary: {
    reason: "침탈·저항",
    reasonDescription: "경제 침탈, 문화 통치, 민족 운동이 강하게 맞물리는 흐름",
    artifact: "독립선언서와 격문",
    artifactDescription: "시험 포인트는 경제 침탈과 민족 운동의 연결 구조 이해",
  },
  timeline: [
    { name: "선사", sub: "형성" },
    { name: "고조선", sub: "질서 시작" },
    { name: "삼국", sub: "경쟁" },
    { name: "남북국", sub: "병존" },
    { name: "고려", sub: "외교·균형" },
    { name: "조선전기", sub: "질서·정립" },
    { name: "조선후기", sub: "동요·전환" },
    { name: "근대", sub: "개항·충돌" },
    { name: "일제강점기", sub: "침탈·저항", active: true },
    { name: "현대", sub: "재편" },
  ],
  todayFocus: {
    era: "일제강점기",
    axis: "침탈·저항",
    description: "경제 침탈, 문화 통치, 민족 운동이 강하게 맞물리는 흐름",
    chips: ["1910 - 1945", "독립선언서와 격문", "연결 주제 1개"],
  },
  connectedPeriods: [
    {
      title: "고려",
      subtitle: "외교·균형",
      years: "918 - 1392",
      description: "외교와 균형 감각이 핵심인 구간",
      note: "대외 관계와 문벌·무신·원 간섭기 흐름",
    },
    {
      title: "조선후기",
      subtitle: "동요·전환",
      years: "1598 - 1863",
      description: "질서가 흔들리고 전환이 시작되는 구간",
      note: "실학, 세도 정치, 민란을 한 흐름으로 묶기",
    },
  ],
  flowSteps: [
    {
      no: "01",
      title: "먼저 복습",
      subtitle: "일제강점기 흐름 가볍게 다시 보기",
      meta: "12개",
      description:
        "먼저 대표 흐름을 다시 맞춰 오늘 복습의 감각을 세웁니다.",
      cta: "복습 이어 보기",
      href: "/review",
      featured: true,
    },
    {
      no: "02",
      title: "다음 문제",
      subtitle: "일제강점기 새 연결 살펴보기",
      meta: "5개",
      description:
        "정리된 흐름 위에 새 개념을 덧입혀 다음 회독으로 넘깁니다.",
      cta: "새 문제 보기",
      href: "/solve",
    },
    {
      no: "03",
      title: "이어서 보기",
      subtitle: "고려로 이어 보기",
      meta: "고려",
      description:
        "오늘 복원한 감각을 다음 시대의 흐름으로 바로 이어 봅니다.",
      cta: "고려 이어 보기",
      href: "/solve",
      quiet: true,
    },
  ],
  chains: [
    {
      id: "고리 01",
      era: "일제강점기",
      axis: "침탈·저항",
      title: "일제 강점기 경제 침탈",
      links: ["토지 수탈", "산업 왜곡", "민족 경제 압박"],
      exam: "경제 침탈과 민족 운동의 연결 구조 이해",
      note:
        "오늘 복습의 중심이 되는 흐름입니다. 먼저 이어두면 이후 문제와 복습이 훨씬 자연스럽게 연결됩니다.",
      href: "/notes",
      featured: true,
    },
    {
      id: "고리 02",
      era: "고려",
      axis: "외교·균형",
      title: "고려 시대의 대외 관계",
      links: ["문벌", "무신", "원 간섭기"],
      exam: "대외 관계와 문벌·무신·원 간섭기 흐름",
      note:
        "핵심 시대 흐름과 맞물려 있어, 지금 같이 봐두면 비슷한 오답을 줄이는 데 도움이 됩니다.",
      href: "/notes",
    },
    {
      id: "고리 03",
      era: "조선후기",
      axis: "동요·전환",
      title: "조선 후기 실학",
      links: ["성리학 비판", "현실 개혁", "실학"],
      exam: "실학, 세도 정치, 민란을 한 흐름으로 묶기",
      note:
        "핵심 구간을 먼저 정리한 뒤 다음 흐름으로 넘어갑니다.",
      href: "/notes",
    },
  ],
  archive: {
    keySentence: "오늘의 핵심 기억: 경제 침탈은 저항을 낳는 흐름이다",
    artifact: "독립선언서와 격문",
    examPoint: "경제 침탈과 민족 운동의 연결 구조 이해",
    linkedFlow: "토지 수탈 → 산업 왜곡 → 민족 경제 압박",
    nextLead: "오늘 복원한 감각을 바로 다음 시대로 연결합니다",
    nextTitle: "고려 흐름 이어 보기",
    nextDescription:
      "외교와 균형 감각이 핵심인 구간을 이어 보면 오늘 본 흐름이 전체 한국사 안에서 더 선명해집니다.",
    nextChips: ["다음 시대", "고려", "외교·균형"],
    nextHref: "/solve",
  },
  bottomNav: [
    { label: "오늘", href: "/today", active: true },
    { label: "학습", href: "/solve" },
    { label: "오답", href: "/notes" },
    { label: "복습", href: "/review" },
  ],
};

function ConnectedCard({ period }: { period: ConnectedPeriod }) {
  return (
    <InfoPanel className="rounded-[24px] bg-stone-950/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-medium text-stone-100">{period.title}</div>
          <div className="mt-1 text-sm text-stone-400">{period.subtitle}</div>
        </div>
        <div className="rounded-full border border-stone-700 bg-black/20 px-3 py-1 text-[11px] tracking-[0.16em] text-stone-400">
          {period.years}
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-stone-300">{period.description}</p>
      <div className="mt-4 rounded-[18px] border border-stone-800 bg-black/15 px-4 py-3 text-sm text-stone-400">
        {period.note}
      </div>
    </InfoPanel>
  );
}

function ChainCard({ chain }: { chain: Chain }) {
  return (
    <RecordCard
      topLabel={
        <FrameLabel icon={<ScrollText className="h-3.5 w-3.5" />} text={chain.id} subtle />
      }
      topBadge={chain.featured ? <FrameLabel text="우선 복원" /> : undefined}
      eyebrow={chain.era}
      subEyebrow={chain.axis}
      title={chain.title}
      lead={chain.featured ? "오늘 먼저 볼 흐름" : undefined}
      featured={chain.featured}
      titleClassName="line-clamp-2 text-[1.72rem]"
      footerHref={chain.href}
      footerLabel="오답노트에서 이어 보기"
      sections={
        <>
          <TextBlock label="연결 사슬" value={<FlowPills items={chain.links} />} />
          <TextBlock label="시험에서 같이 볼 축" value={chain.exam} />
          <p className="text-sm leading-7 text-stone-400">{chain.note}</p>
        </>
      }
    />
  );
}

function HeroSection({
  hero,
  pointSummary,
}: {
  hero: TodayPageData["hero"];
  pointSummary: TodayPageData["pointSummary"];
}) {
  return (
    <MotionSection>
      <HeroShell>
        <HeroGrid
          left={
            <>
              <div className="flex flex-col gap-6">
                <FrameLabel
                  icon={<Landmark className="h-4 w-4 text-amber-300/70" />}
                  text={hero.title}
                />

                <div className="space-y-4">
                  <div className="text-sm tracking-[0.2em] text-stone-400">
                    {hero.subtitle}
                  </div>
                  <div className="flex flex-wrap items-end gap-4">
                    <h1 className="text-5xl font-semibold tracking-[-0.06em] text-stone-50 md:text-7xl">
                      {hero.era}
                    </h1>
                    <span className="pb-1 text-base tracking-[0.16em] text-amber-100/85 md:text-lg">
                      {hero.axis}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-stone-300">
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1">
                      {hero.years}
                    </span>
                    <span className="rounded-full border border-stone-700 bg-black/20 px-3 py-1">
                      {hero.oneLine}
                    </span>
                  </div>
                </div>

                <div className="max-w-2xl space-y-3">
                  <p className="text-lg leading-8 text-stone-200 md:text-xl">
                    오늘은 끊긴 흐름을 다시 맞추고, 다음 회독에서 더 자연스럽게 이어지게 만드는 날입니다.
                  </p>
                  <p className="text-sm leading-7 text-stone-400 md:text-base">{hero.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryAction href="/review">복습 이어 보기</PrimaryAction>
                <SecondaryAction href="/notes">
                  <BookOpen className="h-4 w-4" />
                  오답노트 보기
                </SecondaryAction>
              </div>
            </>
          }
          right={
            <div className="flex flex-col gap-4">
              <InfoPanel className="border-stone-800/90 bg-black/20 p-5 shadow-inner shadow-black/30">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                      오늘 포인트
                    </div>
                    <div className="mt-2 text-lg font-medium text-stone-100">
                      중심 시대 {hero.era}
                    </div>
                  </div>
                  <div className="rounded-full border border-amber-300/20 bg-amber-300/10 p-2.5 text-amber-200">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>

                <StatTile {...hero.primaryMetric} featured />

                <FineDivider />

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[22px] border border-stone-800 bg-stone-900/70 p-4">
                    <div className="text-xs text-stone-500">먼저 볼 이유</div>
                    <div className="mt-2 text-base font-medium text-stone-100">
                      {pointSummary.reason}
                    </div>
                    <div className="mt-3 text-sm leading-6 text-stone-400">
                      {pointSummary.reasonDescription}
                    </div>
                  </div>
                  <div className="rounded-[22px] border border-stone-800 bg-stone-900/70 p-4">
                    <div className="text-xs text-stone-500">대표 유물</div>
                    <div className="mt-2 text-base font-medium text-stone-100">
                      {pointSummary.artifact}
                    </div>
                    <div className="mt-3 text-sm leading-6 text-stone-400">
                      {pointSummary.artifactDescription}
                    </div>
                  </div>
                </div>

                <FineDivider />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {hero.sideMetrics.map((metric) => (
                    <StatTile key={metric.label} {...metric} />
                  ))}
                </div>
              </InfoPanel>
            </div>
          }
        />
      </HeroShell>
    </MotionSection>
  );
}

function TimeRailSection({
  timeline,
  todayFocus,
  connectedPeriods,
}: Pick<TodayPageData, "timeline" | "todayFocus" | "connectedPeriods">) {
  return (
    <MotionSection delay={0.08} className="relative">
      <SectionTitle
        eyebrow="시대의 자리"
        title="오늘 복습이 놓인 시대 위치"
        description="전체 흐름 위에서 오늘 먼저 잡아야 할 시대를 확인하고, 바로 이어질 시대만 함께 펼쳐 봅니다."
      />

      <InfoPanel className="relative overflow-hidden rounded-[32px] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,rgba(217,119,6,0.08),transparent_18%)]" />

        <div className="relative grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                  전체 흐름
                </div>
                <div className="mt-2 text-lg font-medium text-stone-100">10개 시대</div>
              </div>
              <FrameLabel text="중심 시대 강조" subtle />
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-3 right-3 top-[-18px] hidden h-px bg-gradient-to-r from-transparent via-stone-700 to-transparent md:block" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {timeline.map((item) => (
                <TimelineNode
                  key={item.name}
                  title={item.name}
                  subtitle={item.sub}
                  active={item.active}
                  badge={item.active ? "중심" : undefined}
                />
              ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-amber-300/25 bg-amber-300/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.32em] text-amber-100/80">
                오늘 중심 시대
              </div>
              <div className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-stone-50">
                {todayFocus.era}
              </div>
              <div className="mt-1 text-sm text-amber-100">{todayFocus.axis}</div>
              <p className="mt-4 text-sm leading-7 text-stone-200">
                {todayFocus.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-300">
                {todayFocus.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-stone-700 bg-black/15 px-3 py-1"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {connectedPeriods.map((period) => (
                <ConnectedCard key={period.title} period={period} />
              ))}
            </div>
          </div>
        </div>
      </InfoPanel>
    </MotionSection>
  );
}

function FlowSequenceSection({ flowSteps }: Pick<TodayPageData, "flowSteps">) {
  return (
    <MotionSection delay={0.16} className="relative">
      <SectionTitle
        eyebrow="복원 순서"
        title="오늘의 학습 순서"
        description="먼저 복습으로 감을 되찾고, 그다음 새 문제와 연결 흐름으로 자연스럽게 넘어갑니다."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {flowSteps.map((step, index) => (
          <StepCard key={step.no} {...step} last={index === flowSteps.length - 1} />
        ))}
      </div>
    </MotionSection>
  );
}

function ChainsSection({ chains }: Pick<TodayPageData, "chains">) {
  return (
    <MotionSection delay={0.25} className="relative">
      <SectionTitle
        eyebrow="잇는 고리"
        title="오늘 다시 보면 편한 연결"
        description="복습과 함께 보면 감을 더 편하게 되찾을 수 있는 흐름을 먼저 다시 이어둡니다."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {chains.map((chain) => (
          <ChainCard key={chain.id} chain={chain} />
        ))}
      </div>
    </MotionSection>
  );
}

function ArchiveSection({ archive }: Pick<TodayPageData, "archive">) {
  return (
    <MotionSection delay={0.34} className="relative">
      <SectionTitle
        eyebrow="기억 보관층"
        title="함께 챙기면 좋은 포인트"
        description="개념, 사료, 기출 관점을 한 번에 정리한 뒤 다음 시대로 자연스럽게 이어집니다."
      />

      <div className="mb-5 rounded-[24px] border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm text-amber-50">
        {archive.keySentence}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <ArchivePanel className="relative overflow-hidden">
          <div className="absolute inset-y-0 left-[168px] hidden w-px bg-stone-800 md:block" />
          <div className="grid gap-4 md:grid-cols-[140px_1fr] md:gap-7">
            <div className="space-y-2">
              <FrameLabel
                icon={<BookMarked className="h-3.5 w-3.5" />}
                text="기록 인덱스"
                subtle
              />
              <div className="pt-2 text-sm text-stone-300">대표 유물</div>
              <div className="text-sm text-stone-300">시험 포인트</div>
              <div className="text-sm text-stone-300">자주 같이 보는 흐름</div>
            </div>
            <div>
              <ArchiveRow label="대표 유물" value={archive.artifact} tone="emphasis" />
              <ArchiveRow label="시험 포인트" value={archive.examPoint} />
              <ArchiveRow label="자주 같이 보는 흐름" value={archive.linkedFlow} />
            </div>
          </div>
        </ArchivePanel>

        <FeaturePanel className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(217,119,6,0.12),transparent_30%)]" />
          <div className="relative">
            <FrameLabel text="다음 연결" />
            <div className="mt-4 text-sm text-amber-100/90">{archive.nextLead}</div>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-stone-50">
              {archive.nextTitle}
            </h3>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              {archive.nextDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-stone-300">
              {archive.nextChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-stone-700 bg-black/15 px-3 py-1"
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <PrimaryAction href={archive.nextHref}>다음 흐름 이어 보기</PrimaryAction>
            </div>
          </div>
        </FeaturePanel>
      </div>
    </MotionSection>
  );
}

function TodayLoadingState() {
  return (
    <HistoryPageShell>
      <div className="h-[320px] animate-pulse rounded-[34px] border border-stone-800 bg-stone-950/50" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[240px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[240px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[200px] animate-pulse rounded-[28px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[200px] animate-pulse rounded-[28px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[200px] animate-pulse rounded-[28px] border border-stone-800 bg-stone-950/40" />
      </div>
    </HistoryPageShell>
  );
}

export default function TodayPage() {
  const userId = getCurrentUserId();
  const [apiData, setApiData] = useState<TodayData | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "empty" | "error">("loading");

  const load = useCallback(() => {
    setStatus("loading");
    getTodayData(userId)
      .then((data) => {
        setApiData(data);
        setStatus(data.today_review_count === 0 ? "empty" : "success");
      })
      .catch(() => setStatus("error"));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const pageData = useMemo<TodayPageData>(() => {
    if (!apiData) return BASE_PAGE_DATA;
    return {
      ...BASE_PAGE_DATA,
      hero: {
        ...BASE_PAGE_DATA.hero,
        sideMetrics: [
          { ...BASE_PAGE_DATA.hero.sideMetrics[0], value: String(apiData.today_review_count) },
          { ...BASE_PAGE_DATA.hero.sideMetrics[1], value: String(apiData.today_new_count) },
          { ...BASE_PAGE_DATA.hero.sideMetrics[2], value: String(apiData.today_review_count + apiData.today_new_count) },
        ],
      },
      flowSteps: BASE_PAGE_DATA.flowSteps.map((step, i) => ({
        ...step,
        meta: i === 0 ? `${apiData.today_review_count}개`
             : i === 1 ? `${apiData.today_new_count}개`
             : step.meta,
      })),
      todayFocus: {
        ...BASE_PAGE_DATA.todayFocus,
        chips: apiData.weak_topics.length > 0
          ? apiData.weak_topics
          : BASE_PAGE_DATA.todayFocus.chips,
      },
    };
  }, [apiData]);

  if (status === "loading") {
    return <TodayLoadingState />;
  }

  if (status === "error") {
    return (
      <HistoryPageShell>
        <InfoPanel className="rounded-[34px] p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
            불러오기 실패
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-400">
            서버 연결이 원활하지 않습니다.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-5 py-3 text-sm font-medium text-amber-50 transition hover:bg-amber-300/18"
            >
              재시도
            </button>
          </div>
        </InfoPanel>
        <BottomRouteNav items={BASE_PAGE_DATA.bottomNav} />
      </HistoryPageShell>
    );
  }

  if (status === "empty") {
    return (
      <HistoryPageShell>
        <InfoPanel className="rounded-[34px] p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
            오늘 복습할 문항이 없어요
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-400">
            새 문제를 풀면 복습 큐에 자동으로 추가됩니다.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryAction href="/solve">새 문제 시작</PrimaryAction>
          </div>
        </InfoPanel>
        <BottomRouteNav items={BASE_PAGE_DATA.bottomNav} />
      </HistoryPageShell>
    );
  }

  return (
    <HistoryPageShell>
      <HeroSection hero={pageData.hero} pointSummary={pageData.pointSummary} />
      <TimeRailSection
        timeline={pageData.timeline}
        todayFocus={pageData.todayFocus}
        connectedPeriods={pageData.connectedPeriods}
      />
      <FlowSequenceSection flowSteps={pageData.flowSteps} />
      <ChainsSection chains={pageData.chains} />
      <ArchiveSection archive={pageData.archive} />
      <BottomRouteNav items={pageData.bottomNav} />
    </HistoryPageShell>
  );
}
