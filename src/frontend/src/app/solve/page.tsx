"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  Landmark,
  RefreshCcw,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { getQuestions, getQuestionDetail } from "@/lib/api/questions";
import { submitAttempt } from "@/lib/api/attempts";
import { completeReview } from "@/lib/api/review";
import { AttemptResponse, QuestionDetail } from "@/lib/types/api";
import { QuestionCard } from "@/components/solve/QuestionCard";
import { ChoiceList } from "@/components/solve/ChoiceList";
import { SubmitBar } from "@/components/solve/SubmitBar";
import { ResultSheet } from "@/components/solve/ResultSheet";
import { getCurrentUserId } from "@/lib/auth";
import { resolveEraTheme } from "@/lib/theme/era";
import {
  ArchivePanel,
  ArchiveRow,
  BottomRouteNav,
  FeaturePanel,
  HeroGrid,
  HeroShell,
  HistoryPageShell,
  InfoPanel,
  MotionSection,
  PrimaryAction,
  SecondaryAction,
  SectionTitle,
  StatTile,
  StepCard,
  FrameLabel,
} from "@/components/history-ui/primitives";

type SolveState = "loading" | "solving" | "submitting" | "result" | "error";

const SOLVE_BOTTOM_NAV = [
  { label: "오늘", href: "/today" },
  { label: "학습", href: "/solve", active: true },
  { label: "오답", href: "/notes" },
  { label: "복습", href: "/review" },
];

function buildSolveSteps(question: QuestionDetail | null, selectedKey: string | null, state: SolveState) {
  const theme = resolveEraTheme(question?.era_tags ?? "미분류");

  return [
    {
      no: "01",
      title: "문항 읽기",
      subtitle: "사료와 질문을 먼저 분리",
      meta: theme.label,
      description:
        "시대 이름보다 질문이 무엇을 묻는지 먼저 잡고, 사료와 개념이 어떤 판단을 요구하는지 확인합니다.",
      href: "/solve#question-panel",
      cta: "문항 보기",
    },
    {
      no: "02",
      title: "답 선택",
      subtitle: "근거 하나로 선택 고정",
      meta: selectedKey ? `${selectedKey} 선택` : "선택 전",
      description:
        "헷갈리는 보기를 비교하기보다, 정답이 되는 근거를 한 줄로 설명할 수 있는지 기준을 세운 뒤 선택합니다.",
      href: "/solve#choice-list",
      cta: "선지 보기",
    },
    {
      no: "03",
      title: "해설 확인",
      subtitle: "판단을 기억으로 고정",
      meta: state === "result" ? "결과 열림" : "제출 후",
      description:
        "정답 여부보다 왜 맞고 왜 틀렸는지를 짧은 문장으로 고정해 다음 회독과 오답노트로 연결합니다.",
      href: "/solve#submit-dock",
      cta: "해설 준비",
    },
  ];
}

function SolveLoadingState() {
  return (
    <HistoryPageShell>
      <div className="h-[320px] animate-pulse rounded-[34px] border border-stone-800 bg-stone-950/50" />
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="h-[220px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[220px] animate-pulse rounded-[30px] border border-stone-800 bg-stone-950/40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-[240px] animate-pulse rounded-[28px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[240px] animate-pulse rounded-[28px] border border-stone-800 bg-stone-950/40" />
        <div className="h-[240px] animate-pulse rounded-[28px] border border-stone-800 bg-stone-950/40" />
      </div>
      <div className="h-[560px] animate-pulse rounded-[32px] border border-stone-800 bg-stone-950/40" />
    </HistoryPageShell>
  );
}

function SolveErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <HistoryPageShell>
      <MotionSection>
        <InfoPanel className="rounded-[34px] p-10 text-center">
          <div className="mx-auto inline-flex rounded-full border border-stone-700 bg-black/20 p-4 text-stone-300">
            <RefreshCcw className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
            문제를 불러오지 못했습니다
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-stone-400">
            서버 연결이 원활하지 않거나 현재 가져올 수 있는 문항이 없습니다. 새로 다시 불러오면 이어서 진행할 수 있습니다.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-5 py-3 text-sm font-medium text-amber-50 transition hover:bg-amber-300/18"
            >
              다시 시도하기
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </InfoPanel>
      </MotionSection>
      <BottomRouteNav items={SOLVE_BOTTOM_NAV} />
    </HistoryPageShell>
  );
}

function HeroSection({
  question,
  state,
  selectedKey,
  result,
  onRefresh,
}: {
  question: QuestionDetail;
  state: SolveState;
  selectedKey: string | null;
  result: AttemptResponse | null;
  onRefresh: () => void;
}) {
  const theme = resolveEraTheme(question.era_tags);
  const statusLabel =
    state === "result"
      ? result?.is_correct
        ? "정답"
        : "오답"
      : state === "submitting"
        ? "제출 중"
        : "풀이 중";

  return (
    <MotionSection>
      <HeroShell>
        <HeroGrid
          left={
            <>
              <div className="flex flex-col gap-6">
                <FrameLabel icon={<Landmark className="h-4 w-4 text-amber-300/70" />} text="판단실" />

                <div className="space-y-4">
                  <div className="text-sm tracking-[0.2em] text-stone-400">기억을 답으로 옮기는 시간</div>
                  <div className="flex flex-wrap items-end gap-4">
                    <h1 className="text-4xl font-semibold tracking-[-0.05em] text-stone-50 md:text-6xl">
                      {theme.label}
                    </h1>
                    <span className="pb-1 text-base tracking-[0.16em] text-amber-100/85 md:text-lg">
                      {question.concept_tags[0] ?? question.era_tags[0] ?? "실전 적용"}
                    </span>
                  </div>
                  <div className="max-w-2xl text-sm leading-7 text-stone-400 md:text-base">
                    {theme.label} 흐름 위에서 사료와 개념을 실제 판단으로 옮기는 문제입니다. 보기 비교보다 먼저 어떤 근거가 답을 만들고 있는지 짚고, 제출 후 해설과 기억 포인트로 바로 고정합니다.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryAction href="/today">오늘로 돌아가기</PrimaryAction>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-5 py-3 text-sm font-medium text-stone-200 transition hover:border-stone-600 hover:bg-stone-900"
                >
                  <RefreshCcw className="h-4 w-4" />
                  다른 문제 불러오기
                </button>
              </div>
            </>
          }
          right={
            <InfoPanel className="border-stone-800/90 bg-black/20 p-5 shadow-inner shadow-black/30">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-stone-500">실전 상태</div>
                  <div className="mt-2 text-lg font-medium text-stone-100">지금 풀고 있는 문제</div>
                </div>
                <div className="rounded-full border border-amber-300/20 bg-amber-300/10 p-2.5 text-amber-200">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile label="문항" value={String(question.q_num)} note={question.round ? `제${question.round}회 기출` : "연습 문제"} />
                <StatTile label="배점" value={`${question.score}점`} note="이번 판단 비중" />
                <StatTile label="선택" value={selectedKey ?? "대기"} note={selectedKey ? "근거 선택 완료" : "아직 고르기 전"} />
                <StatTile label="상태" value={statusLabel} note={result ? "해설 확인 가능" : "제출 전"} />
              </div>
            </InfoPanel>
          }
        />
      </HeroShell>
    </MotionSection>
  );
}

function FocusSection({ question }: { question: QuestionDetail }) {
  const theme = resolveEraTheme(question.era_tags);

  return (
    <MotionSection delay={0.08} className="relative">
      <SectionTitle
        eyebrow="판단 기준"
        title="이번 문제에서 먼저 볼 축"
        description="문항을 바로 풀기 전에, 어떤 시대 맥락과 개념 태그가 이 문제의 정답 근거를 만드는지 짧게 정리해 둡니다."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <FeaturePanel className="p-6">
          <FrameLabel text="이번 문제 포인트" />
          <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-50">{theme.summary}</h3>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            시대 이름을 맞히는 문제가 아니라, {theme.label} 구간의 핵심 판단축을 보기에 적용하는 문제입니다. 정답 근거가 무엇인지 한 문장으로 먼저 세우고 들어가면 흔들림이 줄어듭니다.
          </p>
        </FeaturePanel>

        <ArchivePanel>
          <ArchiveRow label="시대 태그" value={question.era_tags.join(" · ") || "미분류"} tone="emphasis" />
          <ArchiveRow
            label="개념 태그"
            value={question.concept_tags.length > 0 ? question.concept_tags.join(" · ") : "개념 태그 없음"}
          />
          <ArchiveRow label="출처" value={question.source || "출처 미기록"} />
        </ArchivePanel>
      </div>
    </MotionSection>
  );
}

function SolveFlowSection({
  question,
  selectedKey,
  state,
}: {
  question: QuestionDetail;
  selectedKey: string | null;
  state: SolveState;
}) {
  const steps = buildSolveSteps(question, selectedKey, state);

  return (
    <MotionSection delay={0.16} className="relative">
      <SectionTitle
        eyebrow="실행 순서"
        title="풀이를 해설로 이어 붙이기"
        description="문항 읽기, 답 선택, 해설 확인이 따로 놀지 않도록 이번 문제의 실행 흐름을 한 번에 잡아 둡니다."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <StepCard key={step.no} {...step} last={index === steps.length - 1} />
        ))}
      </div>
    </MotionSection>
  );
}

function SolvePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [state, setState] = useState<SolveState>("loading");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const seenQuestionIdsRef = useRef<string[]>([]);

  const userId = getCurrentUserId();
  const reviewQueueId = searchParams.get("queue");
  const reviewQuestionId = searchParams.get("question");
  const isReviewMode =
    searchParams.get("mode") === "review" &&
    typeof reviewQueueId === "string" &&
    reviewQueueId.length > 0 &&
    typeof reviewQuestionId === "string" &&
    reviewQuestionId.length > 0;

  const loadQuestion = useCallback(async (currentQuestionId?: string) => {
    setState("loading");
    setSelectedKey(null);
    setResult(null);

    if (isReviewMode && reviewQuestionId) {
      try {
        const detail = await getQuestionDetail(reviewQuestionId);
        setQuestion(detail);
        seenQuestionIdsRef.current = Array.from(
          new Set([...seenQuestionIdsRef.current, detail.id]),
        );
        setState("solving");
      } catch (error) {
        console.error(error);
        setQuestion(null);
        setState("error");
      }
      return;
    }

    const excludeQuestionIds = Array.from(
      new Set([currentQuestionId, ...seenQuestionIdsRef.current].filter(Boolean)),
    ) as string[];

    try {
      let list = await getQuestions({
        userId,
        limit: 1,
        excludeAttempted: true,
        excludeQuestionIds,
        shuffle: true,
      });

      // If the user has already attempted every remaining item, keep rotating
      // through different questions instead of getting stuck on the current one.
      if (list.length === 0) {
        list = await getQuestions({
          userId,
          limit: 1,
          excludeQuestionIds: currentQuestionId ? [currentQuestionId] : [],
          shuffle: true,
        });
      }

      if (list.length === 0) {
        setQuestion(null);
        setState("error");
        return;
      }

      const detail = await getQuestionDetail(list[0].id);
      setQuestion(detail);
      seenQuestionIdsRef.current = Array.from(
        new Set([...seenQuestionIdsRef.current, detail.id]),
      );
      setState("solving");
    } catch (error) {
      console.error(error);
      setQuestion(null);
      setState("error");
    }
  }, [isReviewMode, reviewQuestionId, userId]);

  const fetchNewQuestion = useCallback(async () => {
    if (isReviewMode) {
      router.push("/review");
      return;
    }
    await loadQuestion(question?.id);
  }, [isReviewMode, loadQuestion, question?.id, router]);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

  const handleSubmit = async () => {
    if (!selectedKey || !question) return;
    setState("submitting");
    try {
      const response = await submitAttempt({
        user_id: userId,
        question_id: question.id,
        student_answer: selectedKey,
      });

      if (isReviewMode && reviewQueueId) {
        try {
          await completeReview(reviewQueueId, {
            user_id: userId,
            is_correct: response.is_correct,
          });
        } catch (reviewError) {
          console.error(reviewError);
        }
      }

      setResult(response);
      setState("result");
    } catch (error) {
      console.error(error);
      setState("solving");
    }
  };

  if (state === "error") {
    return <SolveErrorState onRetry={fetchNewQuestion} />;
  }

  if (state === "loading" || !question) {
    return <SolveLoadingState />;
  }

  return (
    <HistoryPageShell>
      <HeroSection
        question={question}
        state={state}
        selectedKey={selectedKey}
        result={result}
        onRefresh={fetchNewQuestion}
      />
      <FocusSection question={question} />
      <SolveFlowSection question={question} selectedKey={selectedKey} state={state} />

      <MotionSection delay={0.24} className="relative">
        <SectionTitle
          eyebrow="문항 판단"
          title="지금 풀고 있는 문제"
          description="문항 본문에서 근거를 잡고, 선택지를 한 번만 선명하게 고른 뒤 제출로 이어집니다."
        />

        <div id="question-panel" className="space-y-5 pb-40 md:pb-44">
          <QuestionCard question={question} />
          <div id="choice-list">
            <ChoiceList
              choices={question.choices}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              disabled={state === "submitting" || state === "result"}
            />
          </div>
        </div>
      </MotionSection>

      <ArchivePanel className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_0%,rgba(217,119,6,0.08),transparent_30%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <FrameLabel icon={<ScrollText className="h-3.5 w-3.5" />} text="문제 후 연결" subtle />
            <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-stone-50">
              제출 뒤 바로 이어질 흐름
            </h3>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              정답이면 기억 문장을 고정하고, 오답이면 바로 오답노트와 복습 큐로 이어집니다. 학습 탭은 여기서 끝나는 화면이 아니라 다음 행동으로 흘러가야 합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 xl:justify-end">
            <SecondaryAction href="/notes">
              <BookOpen className="h-4 w-4" />
              오답노트 보기
            </SecondaryAction>
            <PrimaryAction href="/review">복습으로 이어 보기</PrimaryAction>
          </div>
        </div>
      </ArchivePanel>

      <BottomRouteNav items={SOLVE_BOTTOM_NAV} />

      {state !== "result" ? (
        <div id="submit-dock">
          <SubmitBar
            canSubmit={!!selectedKey}
            isSubmitting={state === "submitting"}
            showNext={false}
            onSubmit={handleSubmit}
            onNext={fetchNewQuestion}
          />
        </div>
      ) : null}

      {result ? <ResultSheet result={result} isOpen={state === "result"} onNext={fetchNewQuestion} /> : null}
    </HistoryPageShell>
  );
}

export default function SolvePage() {
  return (
    <Suspense fallback={<SolveLoadingState />}>
      <SolvePageContent />
    </Suspense>
  );
}
