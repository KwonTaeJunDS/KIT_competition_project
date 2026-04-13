"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookMarked,
  BookOpen,
  CircleDot,
  Landmark,
  ScrollText,
  Search,
  Sparkles,
} from "lucide-react";
import {
  AppLink,
  ArchivePanel,
  BottomRouteNav,
  FeaturePanel,
  FineDivider,
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
  TextBlock,
  FilterChip,
} from "@/components/history-ui/primitives";
import { getErrorNotes } from "@/lib/api/notes";
import { getCurrentUserId } from "@/lib/auth";
import { resolveDominantEraTheme } from "@/lib/theme/era";
import { ErrorNoteItem } from "@/lib/types/api";

type Stat = { label: string; value: string; note: string };
type EraTag = { label: string; active?: boolean };
type MemoryPoint = { label: string; description: string };
type NoteItem = {
  id: string;
  era: string;
  type: string;
  question: string;
  myAnswer: string;
  correctAnswer: string;
  diagnosis: string;
  correctedFlow: string[];
  memoryPoint: string;
  note: string;
  featured?: boolean;
};
type NavItem = { label: string; href: string; active?: boolean };

type NotesPageData = {
  hero: {
    title: string;
    subtitle: string;
    era: string;
    axis: string;
    description: string;
    stats: Stat[];
  };
  filters: EraTag[];
  memoryPoints: MemoryPoint[];
  featuredSummary: {
    organizingRule: string;
    representativeMaterial: string;
    nextFlow: string;
    description: string;
  };
  notes: NoteItem[];
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
  { label: "오답", href: "/notes", active: true },
  { label: "복습", href: "/review" },
];

function shorten(text: string | null | undefined, max = 42) {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function dedupe<T>(items: T[]) {
  return Array.from(new Set(items));
}

function normalizeAnswer(answer: string | null | undefined) {
  const normalized = (answer ?? "").trim();
  return normalized || "미기록";
}

function deriveCorrectedFlow(note: ErrorNoteItem) {
  const source = [note.correct_fact, note.memory_hint, note.review_front]
    .filter(Boolean)
    .join(" | ");

  const parsed = source
    .split(/=|,|\/|→|\||·/)
    .map((token) => token.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((token, index, arr) => arr.indexOf(token) === index);

  if (parsed.length >= 3) {
    return parsed.slice(0, 3);
  }

  const fallback = [
    note.era_tags[0] ?? "흐름",
    note.error_type || "오답 분석",
    note.memory_hint || note.correct_fact || "기억 포인트 다시 보기",
  ]
    .map((token) => token.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return fallback.slice(0, 3);
}

function buildNotesPageData(notes: ErrorNoteItem[]): NotesPageData {
  const dominantTheme = resolveDominantEraTheme(notes.map((note) => note.era_tags));
  const uniqueEras = dedupe(notes.flatMap((note) => note.era_tags).filter(Boolean));
  const uniqueTypes = dedupe(notes.map((note) => note.error_type).filter(Boolean));
  const featured = notes[0];

  const memoryPoints = dedupe(
    notes.map((note) =>
      JSON.stringify({
        label: shorten(note.memory_hint || note.correct_fact || note.question_stem, 36),
        description: shorten(
          note.why_wrong ||
            note.review_front ||
            "기억이 끊긴 이유를 다시 확인해 두면 다음 회독이 훨씬 수월합니다.",
          84,
        ),
      }),
    ),
  )
    .map((point) => JSON.parse(point) as MemoryPoint)
    .slice(0, 2);

  const noteCards: NoteItem[] = notes.map((note, index) => ({
    id: `Record ${String(index + 1).padStart(2, "0")}`,
    era: note.era_tags[0] ?? "미분류",
    type: note.error_type || "기억 보완",
    question: note.question_stem,
    myAnswer: normalizeAnswer(note.my_answer),
    correctAnswer: normalizeAnswer(note.correct_answer),
    diagnosis:
      note.why_wrong ||
      "정답 자체보다, 어떤 흐름에서 설명이 끊겼는지부터 다시 정리해 두면 다음 회독이 안정됩니다.",
    correctedFlow: deriveCorrectedFlow(note),
    memoryPoint:
      note.memory_hint ||
      note.correct_fact ||
      "이번 오답에서 다시 붙잡아 둘 핵심 기억 포인트를 남깁니다.",
    note:
      note.review_back ||
      note.correct_fact ||
      "오답은 답을 지우는 과정이 아니라, 흐름을 바로잡아 다시 저장하는 과정입니다.",
    featured: index === 0,
  }));

  const carryOut = dedupe(
    noteCards.flatMap((note) => [note.memoryPoint, note.correctedFlow.join(" -> ")]).filter(Boolean),
  ).slice(0, 3);

  return {
    hero: {
      title: "기억 보관실",
      subtitle: "헷갈린 흐름 다시 보기",
      era: dominantTheme.label,
      axis: uniqueTypes[0] || "기억 복원",
      description:
        "틀린 문제만 다시 모아두는 곳이 아니라, 어디서 설명이 끊겼는지 확인하고 다시 이어두는 기록 화면입니다. 오답 이유, 바로잡은 흐름, 기억 포인트를 함께 보며 천천히 복원합니다.",
      stats: [
        { label: "기록", value: String(notes.length), note: "오늘 남은 기록" },
        { label: "시대", value: String(uniqueEras.length), note: "자주 막힌 축" },
        { label: "기억 포인트", value: String(memoryPoints.length), note: "다시 남길 것" },
        { label: "최근 확인", value: notes.length > 0 ? "있음" : "없음", note: "복습 연계 가능" },
      ],
    },
    filters: [
      { label: "전체 기록", active: true },
      ...uniqueEras.slice(0, 3).map((label) => ({ label })),
      ...uniqueTypes.slice(0, 2).map((label) => ({ label })),
    ],
    memoryPoints:
      memoryPoints.length > 0
        ? memoryPoints
        : [
            {
              label: "기억 포인트가 아직 없습니다",
              description: "오답이 쌓이면 이 구간에 다시 봐야 할 연결이 자동으로 정리됩니다.",
            },
          ],
    featuredSummary: {
      organizingRule: "같은 시대, 같은 개념, 같은 기억 포인트를 묶어 보면 정리가 더 잘됩니다.",
      representativeMaterial:
        shorten(featured?.review_front || featured?.question_stem || "대표 확인 문제", 38) ||
        "대표 확인 문제",
      nextFlow: featured ? deriveCorrectedFlow(featured).join(" -> ") : "오답 흐름 다시 보기",
      description:
        notes.length > 0
          ? `현재는 ${dominantTheme.label} 구간의 기록이 가장 많이 쌓여 있습니다. 단답 암기보다 설명이 끊긴 연결을 먼저 복원해 두는 편이 다음 회독에서 훨씬 안정적입니다.`
          : "오답이 쌓이면 이곳에서 같은 시대와 같은 오류 유형을 기준으로 다시 엮어 볼 수 있습니다.",
    },
    notes: noteCards,
    archive: {
      title: "오늘 가져갈 기억",
      description:
        "이번 회독에서 다시 막히지 않도록, 오답을 답의 문제가 아니라 기억의 연결 문제로 남겨 둡니다.",
      carryOut: carryOut.length > 0 ? carryOut : ["오답은 단답 복기보다 흐름 복원으로 다시 보기"],
      nextActionTitle: "복습과 같이 이어 보기",
      nextActionDescription:
        "지금 남긴 기록을 바로 복습 큐와 연결하면, 오답이 단순 저장이 아니라 다음 학습 행동으로 이어집니다.",
      nextHref: "/review",
    },
    bottomNav: DEFAULT_BOTTOM_NAV,
  };
}

function MemoryPointCard({ point }: { point: MemoryPoint }) {
  return (
    <InfoPanel className="rounded-[24px] bg-stone-950/50 p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full border border-amber-300/20 bg-amber-300/10 p-2 text-amber-100">
          <CircleDot className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-base font-medium text-stone-100">{point.label}</div>
          <div className="mt-2 text-sm leading-6 text-stone-400">{point.description}</div>
        </div>
      </div>
    </InfoPanel>
  );
}

function NoteRecordCard({ item }: { item: NoteItem }) {
  return (
    <RecordCard
      topLabel={<FrameLabel icon={<ScrollText className="h-3.5 w-3.5" />} text={item.id} subtle />}
      topBadge={item.featured ? <FrameLabel text="우선 복원" /> : undefined}
      eyebrow={item.era}
      subEyebrow={item.type}
      title={item.question}
      featured={item.featured}
      sections={
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <MetaBox label="나의 선택" value={item.myAnswer} />
            <MetaBox label="정답" value={item.correctAnswer} emphasis />
          </div>
          <TextBlock label="오답 진단" value={item.diagnosis} />
          <TextBlock label="바로잡은 흐름" value={<FlowPills items={item.correctedFlow} />} />
          <TextBlock label="기억 포인트" value={item.memoryPoint} emphasis />
          <p className="text-sm leading-7 text-stone-400">{item.note}</p>
          <div className="flex flex-wrap gap-3">
            <AppLink
              href="/review"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-100 transition hover:text-amber-100"
            >
              복습과 같이 보기
              <ScrollText className="h-4 w-4" />
            </AppLink>
            <AppLink
              href="/solve"
              className="inline-flex items-center gap-2 text-sm font-medium text-stone-400 transition hover:text-stone-200"
            >
              새 문제 보러 가기
              <ScrollText className="h-4 w-4" />
            </AppLink>
          </div>
        </>
      }
    />
  );
}

function HeroSection({ hero }: { hero: NotesPageData["hero"] }) {
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
                <PrimaryAction href="/review">복습과 같이 보기</PrimaryAction>
                <SecondaryAction href="/today">
                  <BookOpen className="h-4 w-4" />
                  오늘 학습으로 돌아가기
                </SecondaryAction>
              </div>
            </>
          }
          right={
            <InfoPanel className="border-stone-800/90 bg-black/20 p-5 shadow-inner shadow-black/30">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">기록 현황</div>
                  <div className="mt-2 text-lg font-medium text-stone-100">오답은 끊긴 연결의 흔적</div>
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

function FilterSection({ filters, memoryPoints }: Pick<NotesPageData, "filters" | "memoryPoints">) {
  return (
    <MotionSection delay={0.08} className="relative">
      <SectionTitle
        eyebrow="기록 분류"
        title="같은 흐름끼리 다시 묶기"
        description="시대, 개념, 기억 포인트별로 기록을 모아 보면 단순 오답 복습보다 훨씬 빠르게 구조가 다시 잡힙니다."
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <InfoPanel className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">정리 기준</div>
              <div className="mt-2 text-lg font-medium text-stone-100">기록 필터</div>
            </div>
            <div className="rounded-full border border-stone-700 bg-black/15 p-2 text-stone-400">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <FineDivider />
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <FilterChip key={item.label} label={item.label} active={item.active} />
            ))}
          </div>
        </InfoPanel>

        <div className="grid gap-4 md:grid-cols-2">
          {memoryPoints.map((point) => (
            <MemoryPointCard key={point.label} point={point} />
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

function SummarySection({ featuredSummary }: Pick<NotesPageData, "featuredSummary">) {
  return (
    <MotionSection delay={0.16} className="relative">
      <SectionTitle
        eyebrow="복원 기준"
        title="오늘의 정리 축"
        description="단답 암기가 아니라, 설명이 끊긴 곳을 어떻게 다시 엮어야 하는지 먼저 보여주는 구간입니다."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <FeaturePanel className="p-6 md:p-8">
          <FrameLabel text="오늘의 정리 기준" />
          <div className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
            {featuredSummary.organizingRule}
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-300">{featuredSummary.description}</p>
        </FeaturePanel>

        <ArchivePanel>
          <div className="space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-stone-500">대표 자료</div>
              <div className="mt-2 text-xl font-medium text-stone-100">
                {featuredSummary.representativeMaterial}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-stone-500">다음 흐름</div>
              <div className="mt-2 text-xl font-medium text-amber-100">{featuredSummary.nextFlow}</div>
            </div>
          </div>
        </ArchivePanel>
      </div>
    </MotionSection>
  );
}

function RecordsSection({ notes }: Pick<NotesPageData, "notes">) {
  return (
    <MotionSection delay={0.25} className="relative">
      <SectionTitle
        eyebrow="오답 목록"
        title="최근에 다시 보면 좋은 기록"
        description="오답 하나를 정리할 때는 선택지보다, 왜 틀렸고 어떤 연결로 바로잡아야 하는지를 함께 남기는 것이 중요합니다."
      />

      {notes.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {notes.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <NoteRecordCard item={item} />
            </motion.div>
          ))}
        </div>
      ) : (
        <InfoPanel className="rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-8 text-center">
          <div className="mx-auto inline-flex rounded-full border border-stone-700 bg-black/20 p-3 text-stone-300">
            <ScrollText className="h-5 w-5" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
            아직 남겨진 오답 기록이 없습니다
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-400">
            새로 저장된 오답이 생기면 이곳에서 기억 복원과 복습 연결까지 한 번에 정리할 수 있습니다.
          </p>
        </InfoPanel>
      )}
    </MotionSection>
  );
}

function ArchiveSection({ archive }: Pick<NotesPageData, "archive">) {
  return (
    <MotionSection delay={0.34} className="relative">
      <SectionTitle
        eyebrow="기억 보관층"
        title="오늘 가져갈 기억"
        description="이번 회독에서 다시 막히지 않도록, 오답을 답의 문제가 아니라 기억의 연결 문제로 남겨 둡니다."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ArchivePanel>
          <FrameLabel icon={<BookMarked className="h-3.5 w-3.5" />} text="기억 인덱스" subtle />
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
            <PrimaryAction href={archive.nextHref}>복습으로 이어 가기</PrimaryAction>
          </div>
        </FeaturePanel>
      </div>
    </MotionSection>
  );
}

function NotesLoadingState() {
  return (
    <HistoryPageShell>
      <div className="h-[320px] animate-pulse rounded-[34px] border border-stone-800 bg-stone-950/50" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[240px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[240px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-[460px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[460px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
      </div>
    </HistoryPageShell>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<ErrorNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getCurrentUserId();

  useEffect(() => {
    let mounted = true;

    const fetchNotes = async () => {
      try {
        const data = await getErrorNotes(userId);
        if (mounted) {
          setNotes(data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchNotes();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const pageData = useMemo(() => buildNotesPageData(notes), [notes]);

  if (loading) {
    return <NotesLoadingState />;
  }

  return (
    <HistoryPageShell>
      <HeroSection hero={pageData.hero} />
      <FilterSection filters={pageData.filters} memoryPoints={pageData.memoryPoints} />
      <SummarySection featuredSummary={pageData.featuredSummary} />
      <RecordsSection notes={pageData.notes} />
      <ArchiveSection archive={pageData.archive} />
      <BottomRouteNav items={pageData.bottomNav} />
    </HistoryPageShell>
  );
}
