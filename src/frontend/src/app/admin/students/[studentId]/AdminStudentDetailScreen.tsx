import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BookMarked,
  Clock3,
  Share2,
  Undo2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminChip,
  AdminFlowPills,
  AdminFrameLabel,
  AdminMotionSection,
  AdminPanel,
  AdminPrimaryLink,
  AdminSecondaryLink,
  AdminSectionTitle,
  AdminStatusBanner,
  AdminTextBlock,
  AdminValueBox,
} from "@/components/admin/AdminDeskPrimitives";
import {
  getAdminOntologyTask,
  getAdminStudentLeakDetail,
  loadAdminDashboardData,
} from "@/lib/admin/api";
import { cn } from "@/lib/utils/cn";

const RISK_STYLES = {
  높음: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  중간: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  관찰: "border-sky-400/20 bg-sky-400/10 text-sky-100",
} as const;

function getBannerTone(mode: Awaited<ReturnType<typeof loadAdminDashboardData>>["mode"]) {
  if (mode === "mock") return "warning" as const;
  if (mode === "unavailable") return "danger" as const;
  if (mode === "live") return "ok" as const;
  return "neutral" as const;
}

export default async function AdminStudentDetailScreen({
  studentId,
}: {
  studentId: string;
}) {
  const dashboardResult = await loadAdminDashboardData();
  const detail = getAdminStudentLeakDetail(dashboardResult.data, studentId);

  if (!detail && (dashboardResult.mode === "unavailable" || dashboardResult.mode === "empty")) {
    return (
      <AdminShell>
        <div className="space-y-6">
          <AdminStatusBanner
            title={
              dashboardResult.mode === "unavailable"
                ? "학생 상세 API 연결 실패"
                : "학생 상세 데이터 없음"
            }
            message={
              dashboardResult.mode === "unavailable"
                ? `${dashboardResult.message} mock으로 대체하지 않고 빈 상태를 그대로 보여줍니다.`
                : `${dashboardResult.message} 아직 학생 상세를 구성할 집계가 없습니다.`
            }
            tone={getBannerTone(dashboardResult.mode)}
          />
          <AdminPanel className="px-6 py-10">
            <AdminTextBlock label="현재 상태">
              관리자 read-model에서 학생 상세를 아직 불러오지 못했습니다. `/admin/students`
              화면에서 큐 상태부터 다시 확인해 주세요.
            </AdminTextBlock>
            <div className="mt-5">
              <AdminSecondaryLink href="/admin/students">
                학생 개입면으로 돌아가기
              </AdminSecondaryLink>
            </div>
          </AdminPanel>
        </div>
      </AdminShell>
    );
  }

  if (!detail) {
    notFound();
  }

  const recommendedTask = getAdminOntologyTask(
    dashboardResult.data,
    detail.recommendedOntologyTaskId,
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <AdminStatusBanner
          title={
            dashboardResult.mode === "mock" ? "Mock 학생 상세" : "실백엔드 학생 상세"
          }
          message={
            dashboardResult.mode === "mock"
              ? "이 학생 상세는 mock 데이터입니다."
              : "이 학생 상세는 관리자 read-model API 데이터를 사용합니다."
          }
          tone={getBannerTone(dashboardResult.mode)}
        />

        <AdminMotionSection>
          <AdminPanel tone="hero" className="px-7 py-7">
            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
              <div className="min-w-0">
                <AdminFrameLabel icon={<BookMarked size={14} />} text="Student Record" />
                <h1 className="mt-4 font-myeongjo text-[38px] font-bold leading-[1.05] tracking-[-0.05em] text-stone-50">
                  {detail.name} 학생 누수 기록면
                </h1>
                <p className="mt-4 max-w-4xl text-[15px] leading-8 text-stone-400">
                  {detail.summary}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                      RISK_STYLES[detail.risk],
                    )}
                  >
                    위험도 {detail.risk}
                  </span>
                  <AdminChip>{detail.className}</AdminChip>
                  <AdminChip>{detail.currentEra}</AdminChip>
                  <AdminChip tone="warm">{detail.riskLabel}</AdminChip>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {recommendedTask ? (
                    <AdminPrimaryLink href={`/admin/ontology?task=${recommendedTask.id}`}>
                      관계망 워크벤치로 이동
                    </AdminPrimaryLink>
                  ) : null}
                  <AdminSecondaryLink href="/admin/students">
                    학생 개입면으로 돌아가기
                  </AdminSecondaryLink>
                </div>
              </div>

              <AdminPanel tone="feature" className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <AdminFrameLabel icon={<AlertTriangle size={13} />} text="Teacher Focus" />
                    <div className="mt-4 font-myeongjo text-[26px] font-bold leading-[1.15] tracking-[-0.04em] text-stone-50">
                      지금 설명에서
                      <br />
                      놓치면 안 되는 지점
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-700 bg-black/20 text-stone-300">
                    <AlertTriangle size={16} />
                  </div>
                </div>

                <AdminTextBlock label="교사 해석" tone="emphasis">
                  {detail.teacherFocus}
                </AdminTextBlock>

                {recommendedTask ? (
                  <AdminValueBox
                    label="연결된 편집 축"
                    value={recommendedTask.title}
                    detail={recommendedTask.editingGoal}
                    tone="emphasis"
                  />
                ) : null}
              </AdminPanel>
            </div>
          </AdminPanel>
        </AdminMotionSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_minmax(340px,0.68fr)]">
          <AdminMotionSection delay={0.06} className="min-w-0">
            <AdminPanel className="px-6 py-6">
              <AdminSectionTitle
                eyebrow="Broken Chains"
                title="학생이 끊긴 연결 고리"
                description="사건을 다시 나열하는 대신 어디서 흐름이 끊겼는지 축 기준으로 보여줍니다."
              />

              <div className="space-y-4">
                {detail.brokenChains.map((chain, index) => (
                  <article
                    key={chain.title}
                    className="rounded-[24px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-5 py-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminChip tone="accent">CHAIN 0{index + 1}</AdminChip>
                      <AdminChip>{chain.era}</AdminChip>
                    </div>

                    <h3 className="mt-4 font-myeongjo text-[24px] font-bold tracking-[-0.04em] text-stone-50">
                      {chain.title}
                    </h3>

                    <div className="mt-4 rounded-[20px] border border-stone-800 bg-black/15 px-4 py-4">
                      <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
                        다시 묶을 흐름
                      </div>
                      <div className="mt-3">
                        <AdminFlowPills items={chain.chain} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(220px,0.9fr)]">
                      <AdminTextBlock label="왜 여기서 끊기는가">
                        {chain.whyItBreaks}
                      </AdminTextBlock>
                      <AdminValueBox
                        label="시험 축"
                        value={chain.examAxis}
                        detail="같이 설명해야 하는 연결"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </AdminPanel>
          </AdminMotionSection>

          <div className="min-w-0 space-y-6">
            <AdminMotionSection delay={0.1}>
              <AdminPanel tone="soft" className="px-5 py-5" id="review-signals">
                <AdminSectionTitle
                  eyebrow="Review Signals"
                  title="최근 복습 신호"
                  description="학생 화면과 연결되는 복습 누수를 우측 보조 컬럼에 고정했습니다."
                />

                <div className="space-y-3">
                  {detail.reviewSignals.map((signal) => (
                    <AdminValueBox
                      key={signal.title}
                      label={signal.status}
                      value={signal.title}
                      detail={signal.note}
                    />
                  ))}
                </div>
              </AdminPanel>
            </AdminMotionSection>

            <AdminMotionSection delay={0.14}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Teacher Notes"
                  title="수업 메모"
                  description="실제 개입 문장과 학생 반응을 기록해 다음 수업으로 이어지게 했습니다."
                />

                <div className="space-y-3">
                  {detail.teacherNotes.map((note) => (
                    <AdminTextBlock key={note} label="교사 메모">
                      {note}
                    </AdminTextBlock>
                  ))}
                </div>

                {recommendedTask ? (
                  <div className="mt-4">
                    <AdminPrimaryLink href={`/admin/ontology?task=${recommendedTask.id}`}>
                      연결된 편집 축 보기
                    </AdminPrimaryLink>
                  </div>
                ) : null}
              </AdminPanel>
            </AdminMotionSection>
          </div>
        </div>

        <AdminMotionSection delay={0.18}>
          <AdminPanel tone="soft" className="px-6 py-6">
            <AdminSectionTitle
              eyebrow="Intervention Log"
              title="수업 개입 이력"
              description="개별 설명과 복습 배정이 실제로 어떤 결과를 만들었는지 시간순으로 봅니다."
              action={
                <AdminFrameLabel
                  icon={<Clock3 size={13} />}
                  text={`${detail.interventions.length}건`}
                  subtle
                />
              }
            />

            <div className="grid gap-4 xl:grid-cols-3">
              {detail.interventions.map((item) => (
                <article
                  key={`${item.date}-${item.action}`}
                  className="rounded-[22px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <AdminChip>{item.date}</AdminChip>
                    <span className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
                      {item.type}
                    </span>
                  </div>
                  <div className="mt-4 text-[15px] font-semibold leading-7 tracking-[-0.02em] text-stone-100">
                    {item.action}
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-stone-400">{item.result}</p>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <AdminSecondaryLink href="/admin/students">
                <Undo2 size={14} />
                학생 개입면으로 돌아가기
              </AdminSecondaryLink>
              {recommendedTask ? (
                <AdminPrimaryLink href={`/admin/ontology?task=${recommendedTask.id}`}>
                  <Share2 size={14} />
                  관계망 워크벤치로 이동
                </AdminPrimaryLink>
              ) : null}
            </div>
          </AdminPanel>
        </AdminMotionSection>
      </div>
    </AdminShell>
  );
}
