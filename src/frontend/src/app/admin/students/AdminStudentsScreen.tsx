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
  AdminStatusBanner,
} from "@/components/admin/AdminDeskPrimitives";
import {
  EMPTY_ADMIN_DASHBOARD_DATA,
  type AdminDashboardLoadResult,
  loadAdminDashboardData,
} from "@/lib/admin/api";
import {
  type AtRiskStudent,
  type DeliveryGap,
  type HotspotCluster,
  type OntologyEditTask,
  type StudentLeakDetail,
} from "@/lib/admin/mockDashboard";
import { cn } from "@/lib/utils/cn";

type RiskFilter = "전체" | AtRiskStudent["risk"];
type LeakFilter =
  | "전체"
  | "끊긴 흐름 3개 이상"
  | "반복 누수 축 있음"
  | "개념 연결 불안정"
  | "시대 흐름 누락";
type ReviewFilter = "전체" | "밀린 복습 있음" | "3건 이상" | "7일 이상 지연";
type SortOption = "긴급도 높음" | "끊긴 흐름 많음" | "복습 지연 많음" | "시대순";
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

function getBannerTone(mode: AdminDashboardLoadResult["mode"]) {
  if (mode === "mock") return "warning" as const;
  if (mode === "unavailable") return "danger" as const;
  if (mode === "live") return "ok" as const;
  return "neutral" as const;
}

function getBannerTitle(mode: AdminDashboardLoadResult["mode"]) {
  if (mode === "live") return "실백엔드 학생 큐";
  if (mode === "mock") return "Mock 학생 큐";
  if (mode === "empty") return "학생 큐 비어 있음";
  return "학생 큐 API 연결 실패";
}

function getBannerMessage(result: AdminDashboardLoadResult) {
  if (result.mode === "live") {
    return `${result.message} 이 화면은 관리자 read-model을 기반으로 학생 개입 우선순위를 구성합니다.`;
  }
  if (result.mode === "mock") {
    return `${result.message} 실학생 데이터가 아니라 시연용 정적 큐를 보고 있습니다.`;
  }
  if (result.mode === "empty") {
    return `${result.message} mock으로 대체하지 않고 빈 큐를 그대로 보여줍니다.`;
  }
  return `${result.message} 연결 실패 시에도 mock으로 치환하지 않고 빈 상태를 유지합니다.`;
}

function getPriorityBand(student: AtRiskStudent): PriorityBand {
  if (student.risk === "높음" || student.brokenFlows >= 3) return "긴급";
  if (student.risk === "중간" || student.overdueReviews >= 3) return "주의";
  return "관찰";
}

function getPriorityReasons(student: AtRiskStudent, sharedImpactCount: number) {
  const reasons: string[] = [];

  if (student.brokenFlows >= 3) reasons.push("구조 누수 높음");
  if (student.overdueReviews >= 3) reasons.push("복습 지연 큼");
  if (student.recentStatus === "재실패") reasons.push("최근 상태 재실패");
  if (student.actionType === "ontology" || sharedImpactCount > 1) {
    reasons.push("관계망 수정 후보");
  }
  if (!reasons.length) reasons.push("추가 관찰 필요");

  return reasons.slice(0, 3);
}

function getPriorityScore(
  student: AtRiskStudent,
  band: PriorityBand,
  sharedImpactCount: number,
) {
  const bandScore = band === "긴급" ? 60 : band === "주의" ? 32 : 14;
  return (
    bandScore +
    student.brokenFlows * 7 +
    student.overdueReviews * 5 +
    student.reviewDelayDays * 2 +
    sharedImpactCount * 3
  );
}

function getSecondaryAction(student: AtRiskStudent, relatedTaskId: string) {
  if (student.actionType === "ontology" || student.actionType === "explain") {
    return {
      label: "관계망 보기",
      href: `/admin/ontology?task=${relatedTaskId}`,
    };
  }

  if (student.actionType === "review") {
    return {
      label: "복습 흐름 보기",
      href: `/admin/students/${student.id}#review-signals`,
    };
  }

  return {
    label: "학생 상세 보기",
    href: `/admin/students/${student.id}`,
  };
}

function getRecommendedSteps(student: AtRiskStudent, taskTitle: string) {
  const steps = [student.recommendedAction];

  if (student.overdueReviews > 0) {
    steps.push("복습 재배정과 지연 사유 확인");
  }

  if (student.actionType === "ontology") {
    steps.push(`${taskTitle} 초안 검토`);
  } else if (student.actionType === "explain") {
    steps.push("교실 설명 흐름 다시 연결");
  } else if (student.actionType === "review") {
    steps.push("복습 큐와 해설 카드 재점검");
  } else {
    steps.push("관찰 기록 유지");
  }

  return steps.slice(0, 3);
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

function RiskFlag({ risk }: { risk: PriorityBand }) {
  const tone = risk === "긴급" ? "danger" : risk === "주의" ? "warning" : "ok";
  return <AdminSignalBadge tone={tone}>{risk}</AdminSignalBadge>;
}

function SeverityFlag({ risk }: { risk: AtRiskStudent["risk"] }) {
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

function TypeFlag({ type }: { type: string }) {
  return <AdminSignalBadge tone="accent">{type}</AdminSignalBadge>;
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
              <TypeFlag type={student.leakCategory} />
            </div>

            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#f3f1ea]">
                {student.name}
              </h3>
              <span className="text-xs text-stone-500">{student.className}</span>
              <span className="h-1 w-1 rounded-full bg-[#5f584d]" />
              <span className="text-xs text-[#b7b0a6]">{student.currentEra}</span>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {student.priorityReasons.map((reason) => (
            <AdminChip key={`${student.id}-${reason}`} tone="warm">
              {reason}
            </AdminChip>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_220px]">
          <div className="min-w-0 space-y-3">
            <AdminInfoBlock label="현재 막힌 연결" mono>
              {student.weakLink}
            </AdminInfoBlock>
            <AdminInfoBlock label="문제 요약">
              {student.missedTeaching}
            </AdminInfoBlock>
            <AdminInfoBlock label="가장 먼저 할 조치" highlight>
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
              label="공유 영향"
              value={`${student.sharedImpactCount}명`}
              sub={`최근 상태 ${student.recentStatus}`}
            />
          </div>
        </div>

        <div
          onClick={(event) => event.stopPropagation()}
          className="mt-auto pt-4"
        >
          <AdminActionConsole
            primaryHref={student.secondaryActionHref}
            primaryLabel={student.secondaryActionLabel}
            secondaryHref={`/admin/students/${student.id}`}
            secondaryLabel="학생 보기"
            tertiaryLabel={student.relatedTaskTitle}
          />
        </div>
      </div>
    </article>
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
          현재 필터 조건에 맞는 학생이 없습니다. 왼쪽 필터를 조정해 다시 확인해 주세요.
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
            </div>
          </div>
          <TypeFlag type={selectedStudent.leakCategory} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <QueueMetricBox
            label="끊긴 흐름"
            value={String(selectedStudent.brokenFlows)}
            sub={selectedStudent.weakLink}
          />
          <QueueMetricBox
            label="밀린 복습"
            value={String(selectedStudent.overdueReviews)}
            sub={`${selectedStudent.reviewDelayDays}일 지연`}
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
          {selectedStudent.nextTeachingMove}
        </AdminInfoBlock>
      </AdminPanel>

      <AdminPanel className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Core Diagnosis"
          title="교사용 진단"
          description="현재 어떤 연결이 끊겼는지와 다음 수업에서 바로 설명할 조치를 묶었습니다."
        />

        <div className="space-y-3">
          <AdminInfoBlock label="교사 해석">
            {selectedStudent.detail.teacherFocus}
          </AdminInfoBlock>
          <AdminInfoBlock label="권장 단계">
            {selectedStudent.recommendedSteps.join("\n")}
          </AdminInfoBlock>
        </div>
      </AdminPanel>

      <AdminPanel tone="warning" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Impact Preview"
          title="편집 영향 미리보기"
          description="이 학생 문제를 손보면 어떤 축이 함께 흔들리는지 먼저 보여줍니다."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <QueueMetricBox
            label="같이 묶인 학생"
            value={`${selectedStudent.sharedImpactCount}명`}
            sub="동일 축 공유"
          />
          <QueueMetricBox
            label="연결된 편집 축"
            value={selectedTask?.title ?? "미연결"}
            sub={relatedGap?.title ?? "직접 연결된 전달 실패 없음"}
          />
        </div>

        <div className="mt-4 space-y-3">
          {relatedHotspots.map((cluster) => (
            <AdminInfoBlock key={cluster.title} label={cluster.era}>
              {cluster.title}
              {"\n"}
              {cluster.signal}
            </AdminInfoBlock>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel tone="soft" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Actions"
          title="바로 이동"
          description="학생 개입과 관계망 workbench를 같은 흐름으로 잇는 바로가기입니다."
        />
        <AdminActionConsole
          primaryHref={`/admin/ontology?task=${selectedStudent.relatedTaskId}`}
          primaryLabel="관계망 워크벤치"
          secondaryHref={`/admin/students/${selectedStudent.id}`}
          secondaryLabel="학생 상세"
          tertiaryLabel={selectedStudent.relatedTaskTitle}
        />
      </AdminPanel>

      <AdminPanel tone="danger" className="px-5 py-5">
        <AdminSectionTitle
          eyebrow="Evidence Warning"
          title="현재 한계"
          description="학생 큐는 read-model 기반이며, 온톨로지 저장은 운영 초안 단계입니다."
        />
        <p className="text-sm leading-6 text-[#f0c1b7]">
          교사 큐는 실백엔드 집계를 읽지만, 온톨로지 편집은 즉시 전역 그래프를 재계산하지
          않습니다. 현재는 서버 우선 draft/workbench 흐름으로 동작합니다.
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
            label="누수 유형"
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
            options={["전체", "밀린 복습 있음", "3건 이상", "7일 이상 지연"]}
          />
          <FilterSelect
            label="정렬"
            value={sortOption}
            onChange={setSortOption}
            options={["긴급도 높음", "끊긴 흐름 많음", "복습 지연 많음", "시대순"]}
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

        {!filteredStudents.length ? (
          <div className="rounded-[24px] border border-dashed border-stone-800 bg-black/10 px-5 py-12 text-center text-[14px] leading-7 text-stone-400">
            지금 조건에 맞는 학생이 없습니다. 필터를 완화해 다시 확인해 주세요.
          </div>
        ) : null}
      </div>
    </AdminPanel>
  );
}

export default function AdminStudentsScreen() {
  const [dashboardResult, setDashboardResult] = useState<AdminDashboardLoadResult | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("전체");
  const [leakFilter, setLeakFilter] = useState<LeakFilter>("전체");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("전체");
  const [sortOption, setSortOption] = useState<SortOption>("긴급도 높음");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    let active = true;

    void loadAdminDashboardData().then((result) => {
      if (active) {
        setDashboardResult(result);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const dashboardData = dashboardResult?.data ?? EMPTY_ADMIN_DASHBOARD_DATA;
  const { students, studentLeakDetails, ontologyTasks, deliveryGaps, hotspotClusters } =
    dashboardData;

  const queueStudents = useMemo<QueueStudent[]>(() => {
    const detailMap = new Map(studentLeakDetails.map((detail) => [detail.id, detail]));
    const taskMap = new Map(ontologyTasks.map((task) => [task.id, task]));

    return students.flatMap((student) => {
      const detail = detailMap.get(student.id);
      if (!detail) {
        return [];
      }

      const task = taskMap.get(detail.recommendedOntologyTaskId);
      if (!task) {
        return [];
      }

      const priorityBand = getPriorityBand(student);
      const secondaryAction = getSecondaryAction(student, task.id);

      return [
        {
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
          priorityReasons: getPriorityReasons(student, task.studentImpactIds.length),
          recommendedSteps: getRecommendedSteps(student, task.title),
          secondaryActionLabel: secondaryAction.label,
          secondaryActionHref: secondaryAction.href,
        },
      ];
    });
  }, [ontologyTasks, studentLeakDetails, students]);

  const filteredStudents = useMemo(() => {
    const filtered = queueStudents.filter((student) => {
      if (riskFilter !== "전체" && student.risk !== riskFilter) return false;
      if (leakFilter === "끊긴 흐름 3개 이상" && student.brokenFlows < 3) return false;
      if (leakFilter === "반복 누수 축 있음" && student.leakCategory !== "반복 누수 축 있음") return false;
      if (leakFilter === "개념 연결 불안정" && student.leakCategory !== "개념 연결 불안정") return false;
      if (leakFilter === "시대 흐름 누락" && student.leakCategory !== "시대 흐름 누락") return false;
      if (reviewFilter === "밀린 복습 있음" && student.overdueReviews === 0) return false;
      if (reviewFilter === "3건 이상" && student.overdueReviews < 3) return false;
      if (reviewFilter === "7일 이상 지연" && student.reviewDelayDays < 7) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortOption === "긴급도 높음") return b.priorityScore - a.priorityScore;
      if (sortOption === "끊긴 흐름 많음") return b.brokenFlows - a.brokenFlows;
      if (sortOption === "복습 지연 많음") return b.reviewDelayDays - a.reviewDelayDays;
      return a.currentEra.localeCompare(b.currentEra, "ko");
    });

    return filtered;
  }, [leakFilter, queueStudents, reviewFilter, riskFilter, sortOption]);

  useEffect(() => {
    setSelectedStudentId((current) => {
      if (filteredStudents.some((student) => student.id === current)) {
        return current;
      }
      return filteredStudents[0]?.id ?? "";
    });
  }, [filteredStudents]);

  const selectedStudent =
    filteredStudents.find((student) => student.id === selectedStudentId) ?? null;

  const selectedTask = selectedStudent
    ? ontologyTasks.find((task) => task.id === selectedStudent.relatedTaskId) ?? null
    : null;

  const relatedGap = selectedStudent
    ? deliveryGaps.find((gap) => gap.relatedTaskId === selectedStudent.relatedTaskId) ??
      null
    : null;

  const relatedHotspots = selectedStudent
    ? hotspotClusters.filter(
        (cluster) =>
          cluster.era === selectedStudent.currentEra ||
          cluster.title.includes(selectedStudent.currentEra),
      )
    : hotspotClusters;

  const urgentCount = queueStudents.filter((student) => student.priorityBand === "긴급").length;
  const ontologyCandidateCount = queueStudents.filter(
    (student) => student.actionType === "ontology",
  ).length;
  const delayedCount = queueStudents.filter((student) => student.overdueReviews > 0).length;

  return (
    <AdminShell>
      <div className="mx-auto flex w-full max-w-[1580px] flex-col gap-6 px-4 md:px-5 xl:px-6 2xl:px-8">
        {dashboardResult ? (
          <AdminStatusBanner
            title={getBannerTitle(dashboardResult.mode)}
            message={getBannerMessage(dashboardResult)}
            tone={getBannerTone(dashboardResult.mode)}
          />
        ) : (
          <AdminStatusBanner
            title="학생 큐 로딩 중"
            message="학생 개입 큐와 상세 진단 데이터를 불러오고 있습니다."
          />
        )}

        <AdminMotionSection>
          <AdminPanel tone="hero" className="px-6 py-6 lg:px-7 lg:py-7">
            <div className="max-w-[72ch] min-w-0">
              <AdminFrameLabel icon={<Users size={14} />} text="Intervention Desk" />
              <h1 className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-stone-50">
                학생 개입 운영면
              </h1>
              <p className="mt-4 max-w-[68ch] text-[15px] leading-8 text-stone-400">
                학생별 누수 우선순위를 왼쪽에 두고, 오른쪽에는 진단과 다음 조치를 고정했습니다.
                이 화면은 관리자 read-model을 읽는 실데이터 큐이며, 온톨로지 편집은 별도
                workbench로 연결됩니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <AdminPrimaryLink href="/admin/ontology">
                  관계망 워크벤치
                </AdminPrimaryLink>
                <AdminSecondaryLink href="#student-queue">
                  학생 개입 큐 보기
                </AdminSecondaryLink>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <AdminMetricTile
                label="오늘 긴급"
                value={`${urgentCount}명`}
                detail="먼저 개입할 학생"
                tone="rose"
              />
              <AdminMetricTile
                label="관계망 후보"
                value={`${ontologyCandidateCount}건`}
                detail="워크벤치 연결 대상"
                tone="amber"
              />
              <AdminMetricTile
                label="밀린 복습"
                value={`${delayedCount}명`}
                detail="복습 지연 학생"
                tone="blue"
              />
              <AdminMetricTile
                label="핫스팟"
                value={`${hotspotClusters.length}개`}
                detail="공통 누수 축"
                tone="emerald"
              />
            </div>
          </AdminPanel>
        </AdminMotionSection>

        <AdminMotionSection delay={0.04}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {hotspotClusters.slice(0, 3).map((cluster) => (
              <AdminInfoBlock key={cluster.title} label={cluster.era}>
                {cluster.title}
                {"\n"}
                {cluster.signal}
              </AdminInfoBlock>
            ))}
            {!hotspotClusters.length ? (
              <AdminStatusBanner
                title="핫스팟 없음"
                message="학생 큐에서 함께 볼 공통 누수 축이 아직 없습니다."
              />
            ) : null}
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
              selectedStudentId={selectedStudentId}
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
