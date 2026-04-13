"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BookOpenCheck, PencilLine, Share2, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminChip,
  AdminFlowPills,
  AdminFrameLabel,
  AdminMotionSection,
  AdminPanel,
  AdminSecondaryLink,
  AdminSectionTitle,
  AdminStatusBanner,
  AdminTextBlock,
  AdminValueBox,
} from "@/components/admin/AdminDeskPrimitives";
import {
  EMPTY_ADMIN_DASHBOARD_DATA,
  type AdminDashboardLoadResult,
  getAdminOntologyDraft,
  getAdminOntologyTask,
  loadAdminDashboardData,
  saveAdminOntologyDraft,
} from "@/lib/admin/api";
import {
  type AtRiskStudent,
  type DeliveryGap,
  type OntologyEditTask,
  type SourceQueueItem,
} from "@/lib/admin/mockDashboard";
import { cn } from "@/lib/utils/cn";

function getBannerTone(mode: AdminDashboardLoadResult["mode"]) {
  if (mode === "mock") return "warning" as const;
  if (mode === "unavailable") return "danger" as const;
  if (mode === "live") return "ok" as const;
  return "neutral" as const;
}

function getBannerTitle(mode: AdminDashboardLoadResult["mode"]) {
  if (mode === "live") return "실백엔드 워크벤치";
  if (mode === "mock") return "Mock 워크벤치";
  if (mode === "empty") return "편집 후보 비어 있음";
  return "워크벤치 API 연결 실패";
}

function getBannerMessage(result: AdminDashboardLoadResult) {
  if (result.mode === "live") {
    return `${result.message} 이 화면은 read-model 위에서 편집 초안만 다루는 workbench입니다.`;
  }
  if (result.mode === "mock") {
    return `${result.message} 실백엔드 작업이 아니라 시연용 정적 편집 큐를 사용합니다.`;
  }
  if (result.mode === "empty") {
    return `${result.message} mock으로 대체하지 않고 빈 workbench 상태를 그대로 보여줍니다.`;
  }
  return `${result.message} 연결 실패 시에도 편집 후보를 mock으로 덮어쓰지 않습니다.`;
}

function OntologyTaskWorkbench({
  tasks,
  task,
  impactedStudents,
  relatedGaps,
  relatedSources,
  onSelectTask,
}: {
  tasks: OntologyEditTask[];
  task: OntologyEditTask;
  impactedStudents: AtRiskStudent[];
  relatedGaps: DeliveryGap[];
  relatedSources: SourceQueueItem[];
  onSelectTask: (taskId: string) => void;
}) {
  const cloneNodes = () => task.nodesPreview.map((node) => ({ ...node }));
  const cloneEdges = () => task.edgesPreview.map((edge) => ({ ...edge }));

  const [draftNodes, setDraftNodes] = useState(cloneNodes);
  const [draftEdges, setDraftEdges] = useState(cloneEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(task.nodesPreview[0]?.id ?? "");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedNode =
    draftNodes.find((node) => node.id === selectedNodeId) ?? draftNodes[0] ?? null;
  const changedEdgeCount = draftEdges.filter(
    (edge, index) => edge.status !== task.edgesPreview[index]?.status,
  ).length;
  const changedNodeCount = draftNodes.filter(
    (node, index) => node.note !== task.nodesPreview[index]?.note,
  ).length;

  useEffect(() => {
    let active = true;
    const nextNodes = cloneNodes();
    const nextEdges = cloneEdges();

    setDraftNodes(nextNodes);
    setDraftEdges(nextEdges);
    setSelectedNodeId(nextNodes[0]?.id ?? "");
    setSaveNotice(null);

    void getAdminOntologyDraft(task.id).then((savedDraft) => {
      if (!active || !savedDraft) {
        return;
      }

      const savedNodes = savedDraft.nodesPreview.map((node) => ({ ...node }));
      const savedEdges = savedDraft.edgesPreview.map((edge) => ({ ...edge }));

      setDraftNodes(savedNodes);
      setDraftEdges(savedEdges);
      setSelectedNodeId(savedNodes[0]?.id ?? nextNodes[0]?.id ?? "");
      setSaveNotice(
        savedDraft.storage === "api"
          ? "서버에 저장된 편집 초안을 불러왔습니다."
          : "브라우저 local draft를 불러왔습니다. 같은 기기에서만 이어집니다.",
      );
    });

    return () => {
      active = false;
    };
  }, [task]);

  function cycleEdgeStatus(targetIndex: number) {
    setDraftEdges((current) =>
      current.map((edge, index) => {
        if (index !== targetIndex) {
          return edge;
        }

        const nextStatus =
          edge.status === "유지" ? "보강" : edge.status === "보강" ? "추가" : "유지";

        return { ...edge, status: nextStatus };
      }),
    );
  }

  function updateSelectedNodeNote(note: string) {
    setDraftNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId ? { ...node, note } : node,
      ),
    );
  }

  function handleResetDraft() {
    const nextNodes = cloneNodes();
    const nextEdges = cloneEdges();

    setDraftNodes(nextNodes);
    setDraftEdges(nextEdges);
    setSelectedNodeId(nextNodes[0]?.id ?? "");
    setSaveNotice("현재 작업 초안을 기본 후보 상태로 되돌렸습니다.");
  }

  async function handleSaveDraft() {
    setIsSaving(true);
    const savedDraft = await saveAdminOntologyDraft(task.id, {
      title: task.title,
      era: task.era,
      nodesPreview: draftNodes,
      edgesPreview: draftEdges,
    });
    setIsSaving(false);
    setSaveNotice(
      savedDraft.storage === "api"
        ? `노드 메모 ${changedNodeCount}개, 엣지 상태 ${changedEdgeCount}개를 서버 draft로 저장했습니다.`
        : `노드 메모 ${changedNodeCount}개, 엣지 상태 ${changedEdgeCount}개를 local draft로 저장했습니다.`,
    );
  }

  return (
    <AdminPanel tone="hero" className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <AdminFrameLabel icon={<Share2 size={13} />} text="Ontology Workbench" />
          <h2 className="mt-4 font-myeongjo text-[34px] font-bold tracking-[-0.05em] text-stone-50">
            관계망 편집 워크벤치
          </h2>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-stone-400">
            학생 누수와 전달 실패 신호를 기준으로 노드와 엣지 초안을 검토하는 화면입니다.
            이 저장은 운영 초안이며, 즉시 전체 그래프를 재계산하지는 않습니다.
          </p>
        </div>
        <AdminChip tone="accent">{task.era}</AdminChip>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tasks.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTask(item.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
              item.id === task.id
                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                : "border-stone-700 bg-black/20 text-stone-300 hover:bg-black/30",
            )}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <AdminValueBox label="편집 축" value={task.title} detail={task.source} tone="emphasis" />
        <AdminValueBox label="연결 소스" value={`${relatedSources.length}개`} />
        <AdminValueBox label="영향 학생" value={`${impactedStudents.length}명`} />
        <AdminValueBox label="전달 실패" value={`${relatedGaps.length}건`} />
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="space-y-5">
          <AdminTextBlock label="편집 목표" tone="emphasis">
            {task.editingGoal}
          </AdminTextBlock>

          <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.92fr)_minmax(320px,1.08fr)]">
            <div className="rounded-[22px] border border-stone-800 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
                개념 노드 초안
              </div>
              <div className="mt-4 space-y-3">
                {draftNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-[18px] border px-3 py-3 text-left transition-colors",
                      node.id === selectedNodeId
                        ? "border-amber-300/20 bg-amber-300/10"
                        : "border-stone-800 bg-black/20 hover:bg-black/30",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-stone-100">
                        {node.label}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
                        {node.role}
                      </div>
                      <p className="mt-2 text-[12px] leading-6 text-stone-400">
                        {node.note}
                      </p>
                    </div>
                    <PencilLine size={14} className="mt-1 shrink-0 text-stone-500" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-stone-800 bg-black/15 px-4 py-4">
              <div className="text-[11px] font-semibold tracking-[0.08em] text-stone-500">
                엣지 구조 초안
              </div>
              <div className="mt-4 space-y-3">
                {draftEdges.map((edge, index) => (
                  <div
                    key={`${edge.from}-${edge.to}-${edge.label}`}
                    className="rounded-[18px] border border-stone-800 bg-black/20 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-semibold text-stone-100">
                        {edge.from} → {edge.to}
                      </div>
                      <button
                        type="button"
                        onClick={() => cycleEdgeStatus(index)}
                        className="rounded-full border border-stone-700 bg-black/15 px-2.5 py-1 text-[10px] font-semibold text-stone-300 transition-colors hover:bg-black/25"
                      >
                        {edge.status}
                      </button>
                    </div>
                    <div className="mt-2 text-[12px] leading-6 text-stone-400">
                      {edge.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <AdminTextBlock label="선택 노드 메모">
            {selectedNode ? (
              <>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-stone-100">
                  {selectedNode.label}
                </div>
                <div className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-stone-500">
                  {selectedNode.role}
                </div>
                <textarea
                  value={selectedNode.note}
                  onChange={(event) => updateSelectedNodeNote(event.target.value)}
                  className="mt-4 h-32 w-full resize-none rounded-[16px] border border-stone-800 bg-black/20 px-3 py-3 text-[13px] leading-6 text-stone-200 outline-none transition-colors focus:border-amber-300/30"
                />
              </>
            ) : (
              "선택한 노드가 없습니다."
            )}
          </AdminTextBlock>

          <AdminTextBlock label="현재 연결 흐름">
            <AdminFlowPills items={draftNodes.map((node) => node.label).slice(0, 4)} />
          </AdminTextBlock>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminValueBox label="수정된 노드 메모" value={`${changedNodeCount}개`} />
            <AdminValueBox label="변경된 엣지 상태" value={`${changedEdgeCount}개`} />
          </div>

          {saveNotice ? (
            <AdminTextBlock label="초안 상태" tone="emphasis">
              {saveNotice}
            </AdminTextBlock>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResetDraft}
              className="inline-flex h-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900/70 px-4 text-[13px] font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
            >
              초안 되돌리기
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/12 px-4 text-[13px] font-semibold text-amber-50 transition-colors hover:bg-amber-300/18 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? "초안 저장 중" : "초안 저장"}
            </button>
          </div>
        </div>
      </div>
    </AdminPanel>
  );
}

function StudentImpactCard({ student }: { student: AtRiskStudent }) {
  return (
    <div className="rounded-[20px] border border-stone-800 bg-black/20 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.02em] text-stone-100">
            {student.name}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-stone-500">
            {student.className}
          </div>
        </div>
        <AdminChip>{student.currentEra}</AdminChip>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-stone-400">{student.weakLink}</p>
      <Link
        href={`/admin/students/${student.id}`}
        className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-stone-300 transition-colors hover:text-stone-100"
      >
        학생 상세 보기
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export default function AdminOntologyScreen() {
  const searchParams = useSearchParams();
  const [dashboardResult, setDashboardResult] = useState<AdminDashboardLoadResult | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");

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
  const { ontologyTasks, students, sourceQueue, deliveryGaps } = dashboardData;

  useEffect(() => {
    const queryTaskId = searchParams.get("task") ?? "";
    const nextTaskId = queryTaskId || ontologyTasks[0]?.id || "";
    setSelectedTaskId((current) => current || nextTaskId);
  }, [ontologyTasks, searchParams]);

  const selectedTask =
    getAdminOntologyTask(dashboardData, selectedTaskId) ?? ontologyTasks[0] ?? null;

  const impactedStudents = useMemo(
    () =>
      selectedTask
        ? students.filter((student) => selectedTask.studentImpactIds.includes(student.id))
        : [],
    [selectedTask, students],
  );
  const relatedSources = useMemo(
    () =>
      selectedTask
        ? sourceQueue.filter((item) => item.relatedTaskId === selectedTask.id)
        : [],
    [selectedTask, sourceQueue],
  );
  const relatedGaps = useMemo(
    () =>
      selectedTask
        ? deliveryGaps.filter((gap) => gap.relatedTaskId === selectedTask.id)
        : [],
    [deliveryGaps, selectedTask],
  );

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
            title="워크벤치 로딩 중"
            message="편집 후보와 저장된 초안 상태를 확인하고 있습니다."
          />
        )}

        <AdminStatusBanner
          title="워크벤치 범위"
          message="온톨로지 편집은 운영 초안입니다. 저장은 서버 우선이고, 서버 저장이 실패하면 같은 브라우저 localStorage draft로 대체됩니다."
          tone="warning"
        />

        {selectedTask ? (
          <AdminMotionSection>
            <OntologyTaskWorkbench
              tasks={ontologyTasks}
              task={selectedTask}
              impactedStudents={impactedStudents}
              relatedGaps={relatedGaps}
              relatedSources={relatedSources}
              onSelectTask={setSelectedTaskId}
            />
          </AdminMotionSection>
        ) : (
          <AdminMotionSection>
            <AdminPanel className="px-6 py-10">
              <AdminStatusBanner
                title="편집할 작업 없음"
                message="관리자 read-model에서 아직 편집 큐를 받지 못했습니다."
              />
            </AdminPanel>
          </AdminMotionSection>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <AdminMotionSection delay={0.08} className="min-w-0">
            <AdminPanel className="px-6 py-6">
              <AdminSectionTitle
                eyebrow="Student Impact"
                title="이 편집 축에 영향받는 학생"
                description="편집 후보가 실제로 어떤 학생 누수와 연결되는지 read-model 기준으로 보여줍니다."
                action={
                  <AdminFrameLabel
                    icon={<Users size={13} />}
                    text={`${impactedStudents.length}명`}
                    subtle
                  />
                }
              />

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {impactedStudents.map((student) => (
                  <StudentImpactCard key={student.id} student={student} />
                ))}
                {!impactedStudents.length ? (
                  <AdminStatusBanner
                    title="영향 학생 없음"
                    message="현재 선택한 편집 축과 연결된 학생이 없습니다."
                  />
                ) : null}
              </div>
            </AdminPanel>
          </AdminMotionSection>

          <div className="min-w-0 space-y-6">
            <AdminMotionSection delay={0.12}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Source Queue"
                  title="연결된 소스"
                  description="현재 편집 축과 직접 연결된 자료만 추려서 보여줍니다."
                />
                <div className="space-y-3">
                  {relatedSources.map((item) => (
                    <AdminValueBox
                      key={item.title}
                      label={item.status}
                      value={item.title}
                      detail={item.note}
                    />
                  ))}
                  {!relatedSources.length ? (
                    <AdminStatusBanner
                      title="연결된 소스 없음"
                      message="이 편집 축에 묶인 자료 큐가 없습니다."
                    />
                  ) : null}
                </div>
              </AdminPanel>
            </AdminMotionSection>

            <AdminMotionSection delay={0.16}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Delivery Gaps"
                  title="관련 전달 실패"
                  description="같은 축에서 반복되는 전달 실패를 함께 보여 편집 우선순위를 명확히 합니다."
                />
                <div className="space-y-3">
                  {relatedGaps.map((gap) => (
                    <AdminValueBox
                      key={gap.title}
                      label={`${gap.affectedStudents}명`}
                      value={gap.title}
                      detail={gap.detail}
                      tone="emphasis"
                    />
                  ))}
                  {!relatedGaps.length ? (
                    <AdminStatusBanner
                      title="관련 전달 실패 없음"
                      message="이 편집 축과 직접 연결된 전달 실패 신호가 없습니다."
                    />
                  ) : null}
                </div>
              </AdminPanel>
            </AdminMotionSection>
          </div>
        </div>

        <AdminMotionSection delay={0.2}>
          <AdminPanel tone="feature" className="px-6 py-6">
            <AdminSectionTitle
              eyebrow="Checklist"
              title="편집 전 확인 기준"
              description="운영 초안을 저장하기 전에 확인해야 할 최소 기준을 고정했습니다."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "학생 누수 카드에서 반복되는 연결이 무엇인지 먼저 확인한다.",
                "노드 메모는 사건 나열이 아니라 설명 축 중심으로 적는다.",
                "초안 저장은 workbench 상태이며 즉시 전체 그래프 재계산은 하지 않는다.",
              ].map((item) => (
                <AdminTextBlock key={item} label="워크벤치 기준">
                  {item}
                </AdminTextBlock>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <AdminSecondaryLink href="/admin">
                <BookOpenCheck size={14} />
                운영 대시보드로 돌아가기
              </AdminSecondaryLink>
            </div>
          </AdminPanel>
        </AdminMotionSection>
      </div>
    </AdminShell>
  );
}
