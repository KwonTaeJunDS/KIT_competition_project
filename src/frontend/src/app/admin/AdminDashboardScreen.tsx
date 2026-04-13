"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleAlert, GitBranch, Sparkles, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminChip,
  AdminFrameLabel,
  AdminMetricTile,
  AdminMotionSection,
  AdminPanel,
  AdminPrimaryLink,
  AdminSecondaryLink,
  AdminSectionTitle,
  AdminStatusBanner,
} from "@/components/admin/AdminDeskPrimitives";
import {
  EMPTY_ADMIN_DASHBOARD_DATA,
  type AdminDashboardLoadResult,
  loadAdminDashboardData,
} from "@/lib/admin/api";
import {
  type AdminSummaryCard,
  type AtRiskStudent,
  type DeliveryGap,
  type OntologyEditTask,
  type SourceQueueItem,
} from "@/lib/admin/mockDashboard";
import { cn } from "@/lib/utils/cn";

const RISK_STYLES = {
  높음: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  중간: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  관찰: "border-sky-400/20 bg-sky-400/10 text-sky-100",
} as const;

function getBannerTone(mode: AdminDashboardLoadResult["mode"]) {
  if (mode === "mock") return "warning" as const;
  if (mode === "unavailable") return "danger" as const;
  if (mode === "live") return "ok" as const;
  return "neutral" as const;
}

function getBannerTitle(mode: AdminDashboardLoadResult["mode"]) {
  if (mode === "live") return "실백엔드 연결";
  if (mode === "mock") return "Mock 모드";
  if (mode === "empty") return "빈 관리자 데이터";
  return "관리자 API 연결 실패";
}

function getBannerMessage(result: AdminDashboardLoadResult) {
  if (result.mode === "live") {
    return `${result.message} 온톨로지 화면은 편집 초안과 영향 미리보기를 제공하는 workbench입니다.`;
  }
  if (result.mode === "mock") {
    return `${result.message} 실백엔드 read-model이 아니라 시연용 정적 데이터를 사용합니다.`;
  }
  if (result.mode === "empty") {
    return `${result.message} 이 상태를 mock으로 덮지 않고 그대로 보여줍니다.`;
  }
  return `${result.message} 연결 실패 시에도 mock으로 대체하지 않고 빈 상태를 유지합니다.`;
}

function StudentPriorityCard({ student }: { student: AtRiskStudent }) {
  return (
    <article className="rounded-[24px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[18px] font-semibold tracking-[-0.03em] text-stone-50">
              {student.name}
            </span>
            <span className="text-[12px] font-semibold text-stone-500">
              {student.className}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                RISK_STYLES[student.risk],
              )}
            >
              위험도 {student.risk}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminChip>{student.currentEra}</AdminChip>
            <AdminChip>{student.axisTag}</AdminChip>
            <AdminChip tone="warm">끊긴 흐름 {student.brokenFlows}</AdminChip>
          </div>
        </div>

        <Link
          href={`/admin/students/${student.id}`}
          className="inline-flex h-10 items-center justify-center rounded-full border border-stone-700 bg-black/20 px-4 text-[12px] font-semibold text-stone-200 transition-colors hover:bg-black/30"
        >
          학생 보기
        </Link>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(220px,0.95fr)]">
        <div className="rounded-[18px] border border-stone-800 bg-black/15 px-4 py-4">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            현재 막힌 연결
          </div>
          <div className="mt-2 text-[15px] font-semibold leading-7 tracking-[-0.02em] text-stone-100">
            {student.weakLink}
          </div>
          <p className="mt-3 text-[13px] leading-6 text-stone-400">
            {student.missedTeaching}
          </p>
        </div>

        <div className="rounded-[18px] border border-stone-800 bg-black/20 px-4 py-4">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            우선 조치
          </div>
          <div className="mt-2 text-[15px] font-semibold leading-7 tracking-[-0.02em] text-stone-100">
            {student.nextTeachingMove}
          </div>
          <div className="mt-3 text-[12px] leading-6 text-stone-400">
            밀린 복습 {student.overdueReviews}건, 최근 상태 {student.recentStatus}
          </div>
        </div>
      </div>
    </article>
  );
}

function OntologyQueueCard({ task }: { task: OntologyEditTask }) {
  return (
    <div className="rounded-[22px] border border-stone-800 bg-black/15 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-[-0.02em] text-stone-100">
            {task.title}
          </div>
          <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
            {task.era} · {task.source}
          </div>
        </div>
        <AdminChip tone="accent">
          {task.nodes}N / {task.edges}E
        </AdminChip>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-stone-400">{task.issue}</p>
      <p className="mt-2 text-[12px] leading-6 text-stone-500">
        {task.editingGoal}
      </p>
    </div>
  );
}

function DeliveryGapCard({ gap }: { gap: DeliveryGap }) {
  return (
    <div className="rounded-[20px] border border-stone-800 bg-black/20 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.02em] text-stone-100">
            {gap.title}
          </div>
          <p className="mt-2 text-[13px] leading-6 text-stone-400">{gap.detail}</p>
        </div>
        <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-3 py-1 text-[11px] font-semibold text-rose-100">
          {gap.affectedStudents}명
        </span>
      </div>
      <Link
        href={`/admin/ontology?task=${gap.relatedTaskId}`}
        className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-stone-300 transition-colors hover:text-stone-100"
      >
        편집 초안 보기
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function SourceQueueCard({ item }: { item: SourceQueueItem }) {
  return (
    <div className="rounded-[20px] border border-stone-800 bg-black/20 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold tracking-[-0.02em] text-stone-100">
          {item.title}
        </div>
        <AdminChip>{item.status}</AdminChip>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-stone-400">{item.note}</p>
      <Link
        href={`/admin/ontology?task=${item.relatedTaskId}`}
        className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-stone-300 transition-colors hover:text-stone-100"
      >
        연결된 작업 보기
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export default function AdminDashboardScreen() {
  const [dashboardResult, setDashboardResult] = useState<AdminDashboardLoadResult | null>(null);

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
  const {
    summaryCards,
    students,
    ontologyTasks,
    deliveryGaps,
    hotspotClusters,
    sourceQueue,
  } = dashboardData;

  const urgentStudents = students.filter(
    (student) => student.risk === "높음" || student.brokenFlows >= 3,
  );
  const leadTask = ontologyTasks[0] ?? null;

  const displaySummaryCards = useMemo<AdminSummaryCard[]>(() => {
    if (summaryCards.length) {
      return summaryCards;
    }

    return [
      {
        label: "집중 관리 학생",
        value: `${urgentStudents.length}명`,
        detail: "바로 확인할 학생",
        tone: "rose",
      },
      {
        label: "전달 실패 신호",
        value: `${deliveryGaps.length}건`,
        detail: "공통 개념 누수",
        tone: "amber",
      },
      {
        label: "편집 후보",
        value: `${ontologyTasks.length}건`,
        detail: "워크벤치 초안 대상",
        tone: "blue",
      },
      {
        label: "소스 큐",
        value: `${sourceQueue.length}건`,
        detail: "검토 대기 자료",
        tone: "emerald",
      },
    ];
  }, [deliveryGaps.length, ontologyTasks.length, sourceQueue.length, summaryCards, urgentStudents.length]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {dashboardResult ? (
          <AdminStatusBanner
            title={getBannerTitle(dashboardResult.mode)}
            message={getBannerMessage(dashboardResult)}
            tone={getBannerTone(dashboardResult.mode)}
          />
        ) : (
          <AdminStatusBanner
            title="관리자 API 로딩 중"
            message="관리자 read-model API 상태를 확인하고 있습니다."
          />
        )}

        <AdminMotionSection>
          <AdminPanel tone="hero" className="px-7 py-7">
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.82fr)]">
              <div className="min-w-0">
                <AdminFrameLabel icon={<Users size={14} />} text="Teacher Dashboard" />
                <h1 className="mt-4 text-[36px] font-semibold leading-[1.02] tracking-[-0.05em] text-stone-50">
                  학생 개입과 관계망 편집을
                  <br />
                  같은 화면에서 보는 운영 대시보드
                </h1>
                <p className="mt-4 max-w-4xl text-[15px] leading-8 text-stone-400">
                  학생별 위험 신호, 반복되는 전달 실패, 온톨로지 편집 후보를 같은 맥락에서 묶어
                  선생님이 바로 개입 순서를 결정할 수 있게 정리했습니다. 이 화면은 관리자 read-model을
                  읽는 운영 페이지이고, 온톨로지 편집은 별도 workbench에서 초안으로 다룹니다.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <AdminChip>긴급 학생 {urgentStudents.length}명</AdminChip>
                  <AdminChip>편집 후보 {ontologyTasks.length}건</AdminChip>
                  <AdminChip tone="warm">전달 실패 {deliveryGaps.length}건</AdminChip>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <AdminPrimaryLink href="/admin/students">
                    학생 개입 큐 보기
                  </AdminPrimaryLink>
                  <AdminSecondaryLink href="/admin/ontology">
                    관계망 워크벤치
                  </AdminSecondaryLink>
                </div>
              </div>

              <AdminPanel tone="feature" className="px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <AdminFrameLabel icon={<GitBranch size={13} />} text="오늘 먼저 볼 편집 축" />
                    <div className="mt-4 whitespace-pre-line text-[24px] font-semibold leading-[1.15] tracking-[-0.04em] text-stone-50">
                      {leadTask
                        ? `${leadTask.title}\n${leadTask.era} 축 재정리`
                        : "편집 후보 로딩 중\n관리자 read-model 대기"}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-700 bg-black/20 text-stone-300">
                    <Sparkles size={16} />
                  </div>
                </div>

                <p className="mt-4 text-[13px] leading-6 text-stone-400">
                  {leadTask
                    ? `${leadTask.issue} ${leadTask.editingGoal}`
                    : "실백엔드 read-model에서 편집 후보를 받으면 이 영역에 현재 우선 작업이 표시됩니다."}
                </p>

                <div className="mt-5 space-y-3">
                  {ontologyTasks.slice(0, 2).map((task) => (
                    <OntologyQueueCard key={task.id} task={task} />
                  ))}
                  {!ontologyTasks.length ? (
                    <AdminStatusBanner
                      title="편집 후보 없음"
                      message="관리자 read-model API에서 아직 온톨로지 편집 후보를 받지 못했습니다."
                    />
                  ) : null}
                </div>
              </AdminPanel>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {displaySummaryCards.map((item) => (
                <AdminMetricTile
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  detail={item.detail}
                  tone={item.tone}
                />
              ))}
            </div>
          </AdminPanel>
        </AdminMotionSection>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.82fr)]">
          <AdminMotionSection delay={0.06} className="min-w-0">
            <AdminPanel className="px-6 py-6">
              <AdminSectionTitle
                eyebrow="Intervention Board"
                title="지금 먼저 봐야 할 학생"
                description="학생별 막힌 연결과 바로 이어질 교사 조치를 운영 큐처럼 읽히게 구성했습니다."
                action={
                  <AdminFrameLabel
                    icon={<CircleAlert size={13} />}
                    text={`긴급 학생 ${urgentStudents.length}명`}
                    subtle
                  />
                }
              />

              <div className="space-y-4">
                {students.map((student) => (
                  <StudentPriorityCard key={student.id} student={student} />
                ))}
                {!students.length ? (
                  <AdminStatusBanner
                    title="학생 개입 데이터 없음"
                    message="학생 위험도와 개입 큐를 아직 받지 못했습니다."
                  />
                ) : null}
              </div>
            </AdminPanel>
          </AdminMotionSection>

          <div className="min-w-0 space-y-6">
            <AdminMotionSection delay={0.1}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Ontology Queue"
                  title="관계망 편집 큐"
                  description="학생 개입과 직접 연결되는 편집 작업만 우선 노출해 운영 대시보드에서 바로 workbench로 건너갈 수 있게 했습니다."
                />
                <div className="space-y-3">
                  {ontologyTasks.map((task) => (
                    <OntologyQueueCard key={task.id} task={task} />
                  ))}
                  {!ontologyTasks.length ? (
                    <AdminStatusBanner
                      title="편집 큐 비어 있음"
                      message="온톨로지 편집 후보가 아직 생성되지 않았습니다."
                    />
                  ) : null}
                </div>
                <div className="mt-4">
                  <AdminPrimaryLink href="/admin/ontology">
                    워크벤치로 이동
                  </AdminPrimaryLink>
                </div>
              </AdminPanel>
            </AdminMotionSection>

            <AdminMotionSection delay={0.14}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Delivery Gaps"
                  title="전달 실패 신호"
                  description="같은 축에서 반복되는 전달 실패를 함께 보면 개별 설명이 아니라 구조 수정으로 바로 연결할 수 있습니다."
                />
                <div className="space-y-3">
                  {deliveryGaps.map((gap) => (
                    <DeliveryGapCard key={gap.title} gap={gap} />
                  ))}
                  {!deliveryGaps.length ? (
                    <AdminStatusBanner
                      title="전달 실패 신호 없음"
                      message="현재 묶여서 표시할 공통 전달 실패 신호가 없습니다."
                    />
                  ) : null}
                </div>
              </AdminPanel>
            </AdminMotionSection>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <AdminMotionSection delay={0.18} className="min-w-0">
            <AdminPanel className="px-6 py-6">
              <AdminSectionTitle
                eyebrow="Hotspot Clusters"
                title="이번 주 먼저 설명할 개념군"
                description="반복 누수 개념군을 먼저 보면 설명 순서와 관계축 편집 우선순위를 동시에 잡을 수 있습니다."
              />

              <div className="grid gap-4 xl:grid-cols-3">
                {hotspotClusters.map((cluster) => (
                  <div
                    key={cluster.title}
                    className="rounded-[22px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <AdminChip>{cluster.era}</AdminChip>
                      <span className="text-[11px] font-semibold text-stone-500">
                        {cluster.affectedStudents}명 영향
                      </span>
                    </div>
                    <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-stone-100">
                      {cluster.title}
                    </h3>
                    <p className="mt-3 text-[13px] leading-6 text-stone-400">
                      {cluster.signal}
                    </p>
                    <div className="mt-4 rounded-[16px] border border-amber-300/15 bg-amber-300/5 px-3 py-3 text-[12px] leading-6 text-amber-50">
                      {cluster.recommendedAction}
                    </div>
                  </div>
                ))}
                {!hotspotClusters.length ? (
                  <AdminStatusBanner
                    title="개념군 없음"
                    message="아직 묶어서 보여줄 hotspot cluster가 없습니다."
                  />
                ) : null}
              </div>
            </AdminPanel>
          </AdminMotionSection>

          <AdminMotionSection delay={0.22} className="min-w-0">
            <AdminPanel tone="feature" className="px-5 py-5">
              <AdminSectionTitle
                eyebrow="Source Queue"
                title="소스 검토 큐"
                description="편집과 학생 추적에 반영할 자료 상태를 보조 컬럼에서 바로 확인할 수 있게 두었습니다."
              />
              <div className="space-y-3">
                {sourceQueue.map((item) => (
                  <SourceQueueCard key={item.title} item={item} />
                ))}
                {!sourceQueue.length ? (
                  <AdminStatusBanner
                    title="자료 큐 없음"
                    message="현재 workbench에 연결된 자료 큐가 없습니다."
                  />
                ) : null}
              </div>
            </AdminPanel>
          </AdminMotionSection>
        </div>
      </div>
    </AdminShell>
  );
}
