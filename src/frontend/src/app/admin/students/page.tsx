"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Layers3,
  SlidersHorizontal,
  Users,
  Wrench,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminActionConsole,
  AdminChip,
  AdminFrameLabel,
  AdminInfoBlock,
  AdminMetricTile,
  AdminMotionSection,
  AdminPanel,
  AdminPrimaryLink,
  AdminSecondaryLink,
  AdminSectionTitle,
  AdminSignalBadge,
} from "@/components/admin/AdminDeskPrimitives";
import {
  type AtRiskStudent,
  type DeliveryGap,
  type HotspotCluster,
  type OntologyEditTask,
  type StudentLeakDetail,
} from "@/lib/admin/mockDashboard";
import {
  getAdminDashboardData,
  getMockAdminDashboardData,
} from "@/lib/admin/api";
import { cn } from "@/lib/utils/cn";

type RiskFilter = "전체" | AtRiskStudent["risk"];
type LeakFilter =
  | "전체"
  | "끊긴 흐름 3개 이상"
  | "반복 누수 축 있음"
  | "개념 연결 불안정"
  | "시대 흐름 누락";
type ReviewFilter = "전체" | "밀린 복습 있음" | "3건 이상" | "최근 7일 미처리";
type SortOption =
  | "긴급도 높은 순"
  | "끊긴 흐름 많은 순"
  | "밀린 복습 많은 순"
  | "최근 악화 순"
  | "중심 시대별";
type PriorityBand = "긴급" | "주의" | "관찰";

type QueueStudent = AtRiskStudent & {
  detail: StudentLeakDetail;
  relatedTaskId: string;
  relatedTaskTitle: string;
  sharedImpactCount: number;
  priorityBand: PriorityBand;
  priorityScore: number;
  priorityReasons: string[];
  recommendedSteps: string[];
  secondaryActionLabel: string;
  secondaryActionHref: string;
};

const RISK_STYLES = {
  높음: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  중간: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  관찰: "border-sky-400/20 bg-sky-400/10 text-sky-100",
} as const;

const PRIORITY_STYLES = {
  긴급: {
    badge: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    rail: "bg-rose-400/80",
  },
  주의: {
    badge: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    rail: "bg-amber-300/80",
  },
  관찰: {
    badge: "border-sky-400/20 bg-sky-400/10 text-sky-100",
    rail: "bg-sky-400/70",
  },
} as const;

function getPriorityBand(student: AtRiskStudent) {
  if (student.risk === "높음" || student.brokenFlows >= 3) return "긴급";
  if (
    student.risk === "중간" ||
    student.overdueReviews >= 3 ||
    student.recentStatus === "진행 중"
  ) {
    return "주의";
  }

  return "관찰";
}

function getPriorityReasons(student: AtRiskStudent, sharedImpactCount: number) {
  const reasons: string[] = [];

  if (student.brokenFlows >= 3) reasons.push("구조 누수 높음");
  if (student.overdueReviews >= 3) reasons.push("복습 체납 높음");
  if (student.recentStatus === "재실패") reasons.push("최근 재실패");
  if (student.actionType === "ontology" || sharedImpactCount > 1) {
    reasons.push("관계망 수정 후보");
  }
  if (reasons.length === 0 && student.actionType === "observe") reasons.push("관찰 유지 가능");
  if (reasons.length === 0) reasons.push("개념 연결 보강 필요");

  return reasons.slice(0, 2);
}

function getSecondaryAction(student: AtRiskStudent, relatedTaskId: string) {
  if (student.actionType === "ontology" || student.actionType === "explain") {
    return {
      label: "관계축 보기",
      href: `/admin/ontology?task=${relatedTaskId}`,
    };
  }

  if (student.actionType === "review") {
    return {
      label: "복습 큐 보기",
      href: `/admin/students/${student.id}#review-signals`,
    };
  }

  return {
    label: "학생 추적 보기",
    href: `/admin/students/${student.id}`,
  };
}

function getRecommendedSteps(student: AtRiskStudent, relatedTaskTitle: string) {
  const steps = [student.recommendedAction];

  if (student.actionType !== "review" && student.overdueReviews > 0) {
    steps.push("복습 재배정 확인");
  }

  if (student.actionType === "ontology") {
    steps.push(`${relatedTaskTitle} 반영`);
  } else if (student.actionType === "explain") {
    steps.push("구조도 다시 설명");
  } else if (student.actionType === "review") {
    steps.push("다음 회독 반영");
  } else {
    steps.push("학생 추적 유지");
  }

  steps.push("개입 후 변화 확인");

  return steps.slice(0, 3);
}

function getPriorityScore(
  student: AtRiskStudent,
  priorityBand: PriorityBand,
  sharedImpactCount: number,
) {
  const bandScore =
    priorityBand === "긴급" ? 60 : priorityBand === "주의" ? 34 : 14;
  const recentScore =
    student.recentStatus === "재실패"
      ? 18
      : student.recentStatus === "신규"
        ? 12
        : student.recentStatus === "진행 중"
          ? 8
          : 4;
  const actionScore =
    student.actionType === "ontology"
      ? 12
      : student.actionType === "review"
        ? 8
        : student.actionType === "explain"
          ? 10
          : 4;

  return (
    bandScore +
    student.brokenFlows * 8 +
    student.overdueReviews * 5 +
    recentScore +
    actionScore +
    sharedImpactCount * 2
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold text-stone-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 w-full rounded-2xl border border-stone-800 bg-black/20 px-4 text-[14px] font-medium text-stone-100 outline-none transition-colors focus:border-amber-300/30"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function QueueStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[18px] border border-stone-800 bg-black/15 px-3 py-3">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-stone-100">
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-5 text-stone-400">{detail}</div>
    </div>
  );
}

function LeakAxisCard({
  title,
  era,
  affectedStudents,
  signal,
  recommendedAction,
}: {
  title: string;
  era: string;
  affectedStudents: number;
  signal: string;
  recommendedAction: string;
}) {
  return (
    <div className="rounded-[20px] border border-stone-800 bg-black/15 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold tracking-[-0.02em] text-stone-100">
            {title}
          </div>
          <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            {era}
          </div>
        </div>
        <AdminChip tone="accent">{affectedStudents}명</AdminChip>
      </div>
      <p className="mt-3 max-w-[44ch] line-clamp-2 text-[13px] leading-6 text-stone-300">
        {signal}
      </p>
      <p className="mt-2 text-[12px] leading-6 text-stone-500">
        {recommendedAction}
      </p>
    </div>
  );
}

function QueueMetricBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[18px] border border-stone-800 bg-black/15 px-4 py-3">
      <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
        {label}
      </div>
      <div className="mt-2 text-[18px] font-semibold tracking-[-0.03em] text-stone-100">
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-5 text-stone-400">{sub}</div>
    </div>
  );
}

function getTrendState(student: QueueStudent) {
  if (student.recentStatus === "재실패") return "악화";
  if (student.recentStatus === "안정") return "개선";
  return "정체";
}

function getProblemTypeLabel(leakCategory: QueueStudent["leakCategory"]) {
  if (leakCategory === "반복 누수 축 있음") return "반복 누수";
  if (leakCategory === "개념 연결 불안정") return "개념 연결";
  return "시대 흐름";
}

function RiskFlag({ risk }: { risk: QueueStudent["priorityBand"] }) {
  const tone =
    risk === "긴급" ? "danger" : risk === "주의" ? "warning" : "ok";

  return <AdminSignalBadge tone={tone}>{risk}</AdminSignalBadge>;
}

function SeverityFlag({ risk }: { risk: QueueStudent["risk"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
        RISK_STYLES[risk],
      )}
    >
      위험도 {risk}
    </span>
  );
}

function TrendFlag({ trend }: { trend: ReturnType<typeof getTrendState> }) {
  const label =
    trend === "악화" ? "악화" : trend === "정체" ? "정체" : "개선";
  const tone =
    trend === "악화" ? "danger" : trend === "정체" ? "neutral" : "ok";

  return <AdminSignalBadge tone={tone}>{label}</AdminSignalBadge>;
}

function TypeFlag({ type }: { type: string }) {
  return <AdminSignalBadge tone="accent">{type}</AdminSignalBadge>;
}

function PriorityReasonCard({
  reasons,
  reviewDelayDays,
  sharedImpactCount,
}: {
  reasons: string[];
  reviewDelayDays: number;
  sharedImpactCount: number;
}) {
  const evidence = [
    ...reasons,
    `지연 ${reviewDelayDays}일`,
    `같은 축 ${sharedImpactCount}명`,
  ].slice(0, 4);

  return (
    <div className="rounded-[18px] border border-[#2a2a31] bg-[#1a1a1d] p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500">
        이번 판단의 근거
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {evidence.map((item) => (
          <AdminChip key={item} tone="warm">
            {item}
          </AdminChip>
        ))}
      </div>
    </div>
  );
}

function StudentQueueCard({
  student,
  isSelected,
  onSelect,
}: {
  student: QueueStudent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      onClick={onSelect}
      className={cn(
        "group relative flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[24px] border px-4 py-4 transition-all duration-200 lg:px-5 lg:py-5",
        isSelected
          ? "border-[#6f5932] bg-[#171513] shadow-[0_0_0_1px_rgba(201,169,107,0.12)]"
          : "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] hover:border-stone-700 hover:bg-black/20",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,169,107,0.18),transparent)]" />
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          PRIORITY_STYLES[student.priorityBand].rail,
        )}
      />

      <div className="min-w-0 pl-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RiskFlag risk={student.priorityBand} />
              <SeverityFlag risk={student.risk} />
              <TrendFlag trend={getTrendState(student)} />
              <TypeFlag type={getProblemTypeLabel(student.leakCategory)} />
            </div>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f3f1ea]">
                {student.name}
              </h3>
              <span className="text-xs text-stone-500">{student.className}</span>
              <span className="h-1 w-1 rounded-full bg-[#5f584d]" />
              <span className="text-xs text-[#b7b0a6]">{student.currentEra}</span>
              <span className="text-xs text-[#b7b0a6]">{student.axisTag}</span>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#332d24] bg-[#1a1713] px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-stone-500">
              끊긴 흐름
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-[#f3f1ea]">
              {student.brokenFlows}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <PriorityReasonCard
            reasons={student.priorityReasons}
            reviewDelayDays={student.reviewDelayDays}
            sharedImpactCount={student.sharedImpactCount}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px]">
          <div className="min-w-0 space-y-3">
            <AdminInfoBlock label="지금 막힌 핵심 연결" mono>
              {student.weakLink}
            </AdminInfoBlock>
            <AdminInfoBlock label="문제 요약">
              {student.missedTeaching}
            </AdminInfoBlock>
            <AdminInfoBlock label="가장 짧은 조치" highlight>
              {student.nextTeachingMove}
            </AdminInfoBlock>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <QueueMetricBox
              label="밀린 복습"
              value={`${student.overdueReviews}건`}
              sub={`${student.reviewDelayDays}일 지연`}
            />
            <QueueMetricBox
              label="영향 학생"
              value={`${student.sharedImpactCount}명`}
              sub={
                student.recentStatus === "재실패"
                  ? "재실패 신호"
                  : `${student.recentStatus} 상태`
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <AdminChip tone="warm">최근 7일</AdminChip>
          <AdminChip tone="warm">같은 축 {student.sharedImpactCount}명</AdminChip>
          <AdminChip tone="warm">{student.recommendedAction}</AdminChip>
        </div>

        <div
          onClick={(event) => event.stopPropagation()}
          className="mt-auto pt-4"
        >
          <AdminActionConsole
            primaryHref={student.secondaryActionHref}
            primaryLabel="관계축 수정"
            secondaryHref={`/admin/students/${student.id}`}
            secondaryLabel="학생 보기"
            tertiaryLabel="복습 재배정"
          />
        </div>
      </div>

      {isSelected ? (
        <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-amber-300/15" />
      ) : null}
    </article>
  );
}

function RelatedHotspotCard({
  title,
  era,
  affectedStudents,
  signal,
  recommendedAction,
}: {
  title: string;
  era: string;
  affectedStudents: number;
  signal: string;
  recommendedAction: string;
}) {
  return (
    <div className="rounded-[20px] border border-stone-800 bg-black/15 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold tracking-[-0.02em] text-stone-100">
              {title}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            {era}
          </div>
        </div>
        <AdminChip tone="accent">{affectedStudents}명</AdminChip>
      </div>
      <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-stone-300">
        {signal}
      </p>
      <p className="mt-2 text-[12px] leading-6 text-stone-500">
        {recommendedAction}
      </p>
    </div>
  );
}

function SelectedStudentPanel({
  selectedStudent,
  selectedTask,
  relatedGap,
  relatedHotspots,
}: {
  selectedStudent: QueueStudent | null;
  selectedTask: OntologyEditTask | null;
  relatedGap: DeliveryGap | null;
  relatedHotspots: HotspotCluster[];
}) {
  if (!selectedStudent) {
    return (
      <AdminPanel className="px-5 py-10 text-center">
        <p className="text-[14px] leading-7 text-stone-400">
          조건에 맞는 학생이 없어 우측 개입 패널을 비워두었습니다. 필터를 조정해
          다시 확인하세요.
        </p>
      </AdminPanel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPanel tone="focus" className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <AdminFrameLabel
              icon={<AlertTriangle size={13} />}
              text="Selected Student"
            />
            <h3 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-stone-50">
              {selectedStudent.name}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <AdminChip>{selectedStudent.className}</AdminChip>
              <AdminChip>{selectedStudent.currentEra}</AdminChip>
              <RiskFlag risk={selectedStudent.priorityBand} />
              <SeverityFlag risk={selectedStudent.risk} />
              <TrendFlag trend={getTrendState(selectedStudent)} />
            </div>
          </div>
          <TypeFlag type={getProblemTypeLabel(selectedStudent.leakCategory)} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <QueueStat
            label="끊긴 흐름"
            value={String(selectedStudent.brokenFlows)}
            detail={selectedStudent.weakLink}
          />
          <QueueStat
            label="밀린 복습"
            value={String(selectedStudent.overdueReviews)}
            detail={`${selectedStudent.reviewDelayDays}일 지연`}
          />
        </div>
      </AdminPanel>

      <AdminPanel tone="focus" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Decision Rail"
          title="지금 결론"
          description="이번 개입에서 먼저 해야 할 행동을 가장 짧은 문장으로 고정합니다."
        />
        <AdminInfoBlock label="우선 결론" highlight>
          구조 설명을 먼저 하고, 복습 재배정은 그 다음에 묶는 것이 가장 효율적입니다.
        </AdminInfoBlock>
      </AdminPanel>

      <AdminPanel className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Core Diagnosis"
          title="핵심 진단"
          description="왜 막혔는지와 지금 바로 설명해야 할 조치를 한 번에 읽는 패널입니다."
        />

        <div className="space-y-3">
          <AdminInfoBlock label="교사용 해석">
            {selectedStudent.detail.teacherFocus}
          </AdminInfoBlock>
          <AdminInfoBlock label="가장 짧은 조치" highlight>
            {selectedStudent.nextTeachingMove}
          </AdminInfoBlock>
        </div>

        <div className="mt-4 rounded-[22px] border border-stone-800 bg-black/15 px-4 py-4">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            실행 순서
          </div>
          <ol className="mt-3 space-y-3">
            {selectedStudent.recommendedSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-black/20 text-[11px] font-semibold text-stone-300">
                  {index + 1}
                </span>
                <span className="text-[14px] leading-6 text-stone-300">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </AdminPanel>

      <AdminPanel tone="warning" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Impact Preview"
          title="편집 영향 미리보기"
          description="이 학생의 문제를 고치면 어디까지 같이 흔들림을 줄일 수 있는지 먼저 봅니다."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <QueueStat
            label="같이 묶인 학생"
            value={`${selectedStudent.sharedImpactCount}명`}
            detail="같은 관계축 공유"
          />
          <QueueStat
            label="최근 재실패"
            value={selectedStudent.recentStatus}
            detail="지금 상태 기준"
          />
        </div>

        <div className="mt-4 space-y-3">
          {relatedHotspots.map((cluster) => (
            <RelatedHotspotCard key={cluster.title} {...cluster} />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel tone="soft" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Related Ontology"
          title={selectedStudent.relatedTaskTitle}
          description="학생 누수와 관계망 수정 후보를 바로 연결하는 의사결정 패널입니다."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <QueueStat
            label="영향 학생"
            value={`${selectedStudent.sharedImpactCount}명`}
            detail="같은 축 공유"
          />
          <QueueStat
            label="공통 누수"
            value={relatedGap?.title ?? "전달 실패 후보"}
            detail={
              relatedGap?.detail ??
              "이 학생의 약점은 공통 관계축 수정과 연결됩니다."
            }
          />
        </div>

        {selectedTask ? (
          <div className="mt-4 rounded-[22px] border border-stone-800 bg-black/20 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
              <Wrench size={13} />
              편집 목표
            </div>
            <p className="mt-2 text-[14px] leading-7 text-stone-300">
              {selectedTask.editingGoal}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <AdminChip tone="warm">재실패 {selectedStudent.recentStatus}</AdminChip>
          <AdminChip tone="warm">같은 축 {selectedStudent.sharedImpactCount}명</AdminChip>
          <AdminChip tone="warm">복습 {selectedStudent.overdueReviews}건</AdminChip>
        </div>

        <div className="mt-4">
          <AdminActionConsole
            primaryHref={`/admin/ontology?task=${selectedStudent.relatedTaskId}`}
            primaryLabel="관계망 편집으로 이동"
            secondaryHref={`/admin/students/${selectedStudent.id}`}
            secondaryLabel="학생 추적 보기"
            tertiaryLabel="근거 문장 더 연결하기"
          />
        </div>
      </AdminPanel>

      <AdminPanel tone="soft" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Recent Interventions"
          title="최근 개입 기록"
          description="설명과 복습 배정이 어떤 반응을 만들었는지 간단히 다시 읽습니다."
        />

        <div className="space-y-3">
          {selectedStudent.detail.interventions.slice(0, 2).map((item) => (
            <div
              key={`${selectedStudent.id}-${item.date}-${item.type}`}
              className="rounded-[18px] border border-stone-800 bg-black/20 px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-stone-100">
                  {item.type}
                </span>
                <span className="text-[12px] font-semibold text-stone-500">
                  {item.date}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-stone-300">
                {item.action}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-stone-400">
                {item.result}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[18px] border border-stone-800 bg-black/20 px-4 py-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            <Layers3 size={13} />
            교사 메모
          </div>
          <p className="mt-2 text-[13px] leading-6 text-stone-300">
            {selectedStudent.detail.teacherNotes[0] ?? "아직 메모가 없습니다."}
          </p>
        </div>
      </AdminPanel>

      <AdminPanel tone="danger" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Evidence Warning"
          title="근거 부족 경고"
          description="판단 근거를 더 연결하면 추천의 신뢰도가 올라갑니다."
        />
        <p className="text-sm leading-6 text-[#f0c1b7]">
          현재 추천은 반복 패턴과 복습 지연 기반입니다. 소스 문장 근거가 더 연결되면
          편집 신뢰도와 학생 설명의 일관성이 올라갑니다.
        </p>
      </AdminPanel>
    </div>
  );
}

function WorkbenchFilters({
  riskFilter,
  setRiskFilter,
  leakFilter,
  setLeakFilter,
  reviewFilter,
  setReviewFilter,
  sortOption,
  setSortOption,
}: {
  riskFilter: RiskFilter;
  setRiskFilter: (value: RiskFilter) => void;
  leakFilter: LeakFilter;
  setLeakFilter: (value: LeakFilter) => void;
  reviewFilter: ReviewFilter;
  setReviewFilter: (value: ReviewFilter) => void;
  sortOption: SortOption;
  setSortOption: (value: SortOption) => void;
}) {
  return (
    <AdminMotionSection delay={0.08}>
      <AdminPanel tone="soft" className="px-4 py-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
          <SlidersHorizontal size={14} />
          운영 필터
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="위험도"
            value={riskFilter}
            onChange={setRiskFilter}
            options={["전체", "높음", "중간", "관찰"]}
          />
          <FilterSelect
            label="누수 규모"
            value={leakFilter}
            onChange={setLeakFilter}
            options={[
              "전체",
              "끊긴 흐름 3개 이상",
              "반복 누수 축 있음",
              "개념 연결 불안정",
              "시대 흐름 누락",
            ]}
          />
          <FilterSelect
            label="복습 상태"
            value={reviewFilter}
            onChange={setReviewFilter}
            options={["전체", "밀린 복습 있음", "3건 이상", "최근 7일 미처리"]}
          />
          <FilterSelect
            label="정렬"
            value={sortOption}
            onChange={setSortOption}
            options={[
              "긴급도 높은 순",
              "끊긴 흐름 많은 순",
              "밀린 복습 많은 순",
              "최근 악화 순",
              "중심 시대별",
            ]}
          />
        </div>
      </AdminPanel>
    </AdminMotionSection>
  );
}

function InterventionQueueSection({
  filteredStudents,
  selectedStudentId,
  setSelectedStudentId,
}: {
  filteredStudents: QueueStudent[];
  selectedStudentId: string;
  setSelectedStudentId: (studentId: string) => void;
}) {
  return (
    <AdminPanel id="student-queue" className="px-5 py-5 lg:px-6 lg:py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            Intervention Queue
          </div>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-stone-50">
            오늘 개입 우선순위
          </h2>
        </div>
        <div className="text-[13px] font-semibold text-stone-500">
          현재 {filteredStudents.length}명
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {filteredStudents.map((student) => (
          <StudentQueueCard
            key={student.id}
            student={student}
            isSelected={student.id === selectedStudentId}
            onSelect={() => setSelectedStudentId(student.id)}
          />
        ))}

        {filteredStudents.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-stone-800 bg-black/10 px-5 py-12 text-center text-[14px] leading-7 text-stone-400">
            지금 조건에 맞는 학생이 없습니다. 필터를 완화해 오늘 개입 큐를 다시
            보세요.
          </div>
        ) : null}
      </div>
    </AdminPanel>
  );
}

export default function AdminStudentsPage() {
  const [dashboardData, setDashboardData] = useState(getMockAdminDashboardData());
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("전체");
  const [leakFilter, setLeakFilter] = useState<LeakFilter>("전체");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("전체");
  const [sortOption, setSortOption] = useState<SortOption>("긴급도 높은 순");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    dashboardData.students[0]?.id ?? "",
  );
  const { students, studentLeakDetails, ontologyTasks, deliveryGaps, hotspotClusters } = dashboardData;

  useEffect(() => {
    let active = true;

    void getAdminDashboardData().then((data) => {
      if (active) {
        setDashboardData(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const queueStudents = useMemo<QueueStudent[]>(() => {
    const detailMap = new Map(
      studentLeakDetails.map((detail) => [detail.id, detail]),
    );
    const taskMap = new Map(ontologyTasks.map((task) => [task.id, task]));

    return students.map((student) => {
      const detail = detailMap.get(student.id);
      if (!detail) {
        throw new Error(`Missing leak detail for ${student.id}`);
      }

      const task = taskMap.get(detail.recommendedOntologyTaskId);
      if (!task) {
        throw new Error(`Missing ontology task for ${detail.recommendedOntologyTaskId}`);
      }

      const priorityBand = getPriorityBand(student);
      const priorityReasons = getPriorityReasons(
        student,
        task.studentImpactIds.length,
      );
      const secondaryAction = getSecondaryAction(student, task.id);

      return {
        ...student,
        detail,
        relatedTaskId: task.id,
        relatedTaskTitle: task.title,
        sharedImpactCount: task.studentImpactIds.length,
        priorityBand,
        priorityScore: getPriorityScore(
          student,
          priorityBand,
          task.studentImpactIds.length,
        ),
        priorityReasons,
        recommendedSteps: getRecommendedSteps(student, task.title),
        secondaryActionLabel: secondaryAction.label,
        secondaryActionHref: secondaryAction.href,
      };
    });
  }, [ontologyTasks, studentLeakDetails, students]);

  const filteredStudents = useMemo(() => {
    const filtered = queueStudents.filter((student) => {
      if (riskFilter !== "전체" && student.risk !== riskFilter) return false;

      if (leakFilter === "끊긴 흐름 3개 이상" && student.brokenFlows < 3) {
        return false;
      }
      if (
        leakFilter === "반복 누수 축 있음" &&
        student.leakCategory !== "반복 누수 축 있음"
      ) {
        return false;
      }
      if (
        leakFilter === "개념 연결 불안정" &&
        student.leakCategory !== "개념 연결 불안정"
      ) {
        return false;
      }
      if (
        leakFilter === "시대 흐름 누락" &&
        student.leakCategory !== "시대 흐름 누락"
      ) {
        return false;
      }

      if (reviewFilter === "밀린 복습 있음" && student.overdueReviews === 0) {
        return false;
      }
      if (reviewFilter === "3건 이상" && student.overdueReviews < 3) {
        return false;
      }
      if (
        reviewFilter === "최근 7일 미처리" &&
        student.reviewDelayDays < 7
      ) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered];

    sorted.sort((a, b) => {
      if (sortOption === "긴급도 높은 순") return b.priorityScore - a.priorityScore;
      if (sortOption === "끊긴 흐름 많은 순") {
        return b.brokenFlows - a.brokenFlows || b.priorityScore - a.priorityScore;
      }
      if (sortOption === "밀린 복습 많은 순") {
        return (
          b.overdueReviews - a.overdueReviews ||
          b.priorityScore - a.priorityScore
        );
      }
      if (sortOption === "최근 악화 순") {
        return (
          b.reviewDelayDays - a.reviewDelayDays ||
          b.priorityScore - a.priorityScore
        );
      }

      return a.currentEra.localeCompare(b.currentEra, "ko");
    });

    return sorted;
  }, [leakFilter, queueStudents, reviewFilter, riskFilter, sortOption]);

  const activeStudentId =
    filteredStudents.find((student) => student.id === selectedStudentId)?.id ??
    filteredStudents[0]?.id ??
    "";

  const selectedStudent =
    filteredStudents.find((student) => student.id === activeStudentId) ?? null;

  const selectedTask = selectedStudent
    ? ontologyTasks.find((task) => task.id === selectedStudent.relatedTaskId) ??
      null
    : null;

  const relatedHotspots = selectedStudent
    ? hotspotClusters.filter(
        (cluster) =>
          cluster.era === selectedStudent.currentEra ||
          cluster.title.includes(selectedStudent.currentEra),
      ).slice(0, 2)
    : hotspotClusters.slice(0, 2);

  const relatedGap = selectedStudent
    ? deliveryGaps.find((gap) => gap.relatedTaskId === selectedStudent.relatedTaskId) ??
      null
    : null;

  const todayUrgentCount = queueStudents.filter(
    (student) => student.priorityBand === "긴급",
  ).length;
  const ontologyCandidateCount = queueStudents.filter(
    (student) => student.actionType === "ontology",
  ).length;
  const repeatedAxisCount = hotspotClusters.filter(
    (cluster) => cluster.affectedStudents >= 8,
  ).length;
  const recentRetryCount = queueStudents.filter(
    (student) => student.recentStatus === "재실패",
  ).length;

  return (
    <AdminShell>
      <div className="mx-auto flex w-full max-w-[1580px] flex-col gap-6 px-4 md:px-5 xl:px-6 2xl:px-8">
        <AdminMotionSection>
          <AdminPanel tone="hero" className="px-6 py-6 lg:px-7 lg:py-7">
            <div className="max-w-[72ch] min-w-0">
              <AdminFrameLabel icon={<Users size={14} />} text="Intervention Desk" />
              <h1 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-stone-50">
                학생 개입 운영면
              </h1>
              <p className="mt-4 max-w-[68ch] text-[15px] leading-8 text-stone-400">
                학생 큐에서 우선순위를 읽고, 오른쪽에서 진단과 조치를 바로 확인한 뒤
                관계망 편집으로 넘기는 콘솔형 운영 화면입니다. 큰 화면에서도 퍼지지
                않게 레이아웃 모드를 고정했습니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <AdminPrimaryLink href="/admin/ontology">
                  관계망 편집 열기
                </AdminPrimaryLink>
                <AdminSecondaryLink href="#student-queue">
                  학생 개입 큐 보기
                </AdminSecondaryLink>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <AdminMetricTile
                label="오늘 긴급"
                value={`${todayUrgentCount}명`}
                detail="우선 개입 대상"
                tone="rose"
              />
              <AdminMetricTile
                label="관계망 수정 후보"
                value={`${ontologyCandidateCount}건`}
                detail="구조 수정 필요"
                tone="amber"
              />
              <AdminMetricTile
                label="반복 누수 축"
                value={`${repeatedAxisCount}개`}
                detail="공통으로 흔들림"
                tone="emerald"
              />
              <AdminMetricTile
                label="최근 재실패"
                value={`${recentRetryCount}명`}
                detail="같은 축 재발"
                tone="rose"
              />
            </div>
          </AdminPanel>
        </AdminMotionSection>

        <AdminMotionSection delay={0.04}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {hotspotClusters.slice(0, 3).map((cluster) => (
              <LeakAxisCard key={cluster.title} {...cluster} />
            ))}
          </div>
        </AdminMotionSection>

        <WorkbenchFilters
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          leakFilter={leakFilter}
          setLeakFilter={setLeakFilter}
          reviewFilter={reviewFilter}
          setReviewFilter={setReviewFilter}
          sortOption={sortOption}
          setSortOption={setSortOption}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_400px] 2xl:grid-cols-[minmax(0,1.75fr)_420px] xl:gap-7">
          <AdminMotionSection delay={0.12} className="min-w-0">
            <InterventionQueueSection
              filteredStudents={filteredStudents}
              selectedStudentId={activeStudentId}
              setSelectedStudentId={setSelectedStudentId}
            />
          </AdminMotionSection>

          <AdminMotionSection delay={0.16} className="min-w-0">
            <aside className="min-w-0">
              <div className="xl:sticky xl:top-[96px]">
                <SelectedStudentPanel
                  selectedStudent={selectedStudent}
                  selectedTask={selectedTask}
                  relatedGap={relatedGap}
                  relatedHotspots={relatedHotspots}
                />
              </div>
            </aside>
          </AdminMotionSection>
        </div>
      </div>
    </AdminShell>
  );
}
