"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  PencilLine,
  Share2,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminChip,
  AdminFlowPills,
  AdminFrameLabel,
  AdminMotionSection,
  AdminPanel,
  AdminSecondaryLink,
  AdminSectionTitle,
  AdminTextBlock,
  AdminValueBox,
} from "@/components/admin/AdminDeskPrimitives";
import {
  type AtRiskStudent,
  type DeliveryGap,
  type OntologyEditTask,
  type SourceQueueItem,
} from "@/lib/admin/mockDashboard";
import {
  getAdminDashboardData,
  getAdminOntologyDraft,
  getAdminOntologyTask,
  getMockAdminDashboardData,
  saveAdminOntologyDraft,
} from "@/lib/admin/api";
import { cn } from "@/lib/utils/cn";

type OntologyTaskDraftProps = {
  tasks: OntologyEditTask[];
  task: OntologyEditTask;
  impactedStudents: AtRiskStudent[];
  relatedGaps: DeliveryGap[];
  relatedSources: SourceQueueItem[];
  onSelectTask: (taskId: string) => void;
};

function OntologyTaskDraft({
  tasks,
  task,
  impactedStudents,
  relatedGaps,
  relatedSources,
  onSelectTask,
}: OntologyTaskDraftProps) {
  const cloneNodes = () => task.nodesPreview.map((node) => ({ ...node }));
  const cloneEdges = () => task.edgesPreview.map((edge) => ({ ...edge }));
  const [draftNodes, setDraftNodes] = useState(() =>
    cloneNodes(),
  );
  const [draftEdges, setDraftEdges] = useState(() =>
    cloneEdges(),
  );
  const [selectedNodeId, setSelectedNodeId] = useState(task.nodesPreview[0]?.id ?? "");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedNode =
    draftNodes.find((node) => node.id === selectedNodeId) ?? draftNodes[0];
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
          ? "저장된 편집 초안을 불러왔습니다."
          : "이 브라우저에 저장된 편집 초안을 불러왔습니다.",
      );
    });

    return () => {
      active = false;
    };
  }, [task]);

  function cycleEdgeStatus(targetIndex: number) {
    setDraftEdges((current) =>
      current.map((edge, index) => {
        if (index !== targetIndex) return edge;

        const nextStatus =
          edge.status === "유지"
            ? "보강"
            : edge.status === "보강"
              ? "추가"
              : "유지";

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
    setSaveNotice("기본 편집 초안으로 되돌렸습니다. 저장하면 이 상태가 유지됩니다.");
  }

  async function handleApplyDraft() {
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
        ? `노드 ${changedNodeCount}개, 엣지 ${changedEdgeCount}개 초안을 서버에 저장했습니다. 다시 열어도 이어서 검토할 수 있습니다.`
        : `노드 ${changedNodeCount}개, 엣지 ${changedEdgeCount}개 초안을 이 브라우저에 저장했습니다. 같은 기기에서 다시 열어도 이어서 볼 수 있습니다.`,
    );
  }

  return (
    <AdminPanel tone="hero" className="px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <AdminFrameLabel icon={<Share2 size={13} />} text="Ontology Workbench" />
          <h2 className="mt-4 font-myeongjo text-[34px] font-bold tracking-[-0.05em] text-stone-50">
            관계망 편집실
          </h2>
          <p className="mt-3 max-w-3xl text-[14px] leading-7 text-stone-400">
            학생별 누수와 전달 실패 신호를 기준으로, 노드와 엣지를 다시 묶어
            설명 구조를 선명하게 만드는 작업면입니다.
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

          <div className="grid gap-4 2xl:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)]">
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
                    <div>
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
                    <PencilLine size={14} className="mt-1 text-stone-500" />
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
            ) : null}
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-stone-700 bg-stone-900/70 px-4 text-[13px] font-semibold text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-900"
            >
              초안 되돌리기
            </button>
            <button
              type="button"
              onClick={handleApplyDraft}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-4 text-[13px] font-semibold text-amber-50 transition-colors hover:bg-amber-300/18 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? "초안 저장 중" : "초안 저장"}
            </button>
          </div>
        </div>
      </div>
    </AdminPanel>
  );
}

function StudentImpactCard({
  student,
}: {
  student: AtRiskStudent;
}) {
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

function AdminOntologyPageContent() {
  const [dashboardData, setDashboardData] = useState(getMockAdminDashboardData());
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("task") ?? dashboardData.ontologyTasks[0]?.id ?? "";
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId);
  const { ontologyTasks, students, sourceQueue, deliveryGaps } = dashboardData;

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

  const selectedTask = getAdminOntologyTask(dashboardData, selectedTaskId) ?? ontologyTasks[0];
  const impactedStudents = students.filter((student) =>
    selectedTask.studentImpactIds.includes(student.id),
  );
  const relatedSources = sourceQueue.filter(
    (item) => item.relatedTaskId === selectedTask.id,
  );
  const relatedGaps = deliveryGaps.filter(
    (gap) => gap.relatedTaskId === selectedTask.id,
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <AdminMotionSection>
          <OntologyTaskDraft
            tasks={ontologyTasks}
            key={selectedTask.id}
            task={selectedTask}
            impactedStudents={impactedStudents}
            relatedGaps={relatedGaps}
            relatedSources={relatedSources}
            onSelectTask={setSelectedTaskId}
          />
        </AdminMotionSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <AdminMotionSection delay={0.08} className="min-w-0">
            <AdminPanel className="px-6 py-6">
              <AdminSectionTitle
                eyebrow="Student Impact"
                title="이 편집 축에 영향 받는 학생"
                description="관계 수정이 실제로 어느 학생의 누수 복원과 연결되는지 학생 추적 기준으로 정리합니다."
                action={<AdminFrameLabel icon={<Users size={13} />} text={`${impactedStudents.length}명`} subtle />}
              />

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {impactedStudents.map((student) => (
                  <StudentImpactCard key={student.id} student={student} />
                ))}
              </div>
            </AdminPanel>
          </AdminMotionSection>

          <div className="min-w-0 space-y-6">
            <AdminMotionSection delay={0.12}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Source Queue"
                  title="연결된 소스"
                  description="지금 편집 중인 축에 직접 연결된 자료만 추려서 보여줍니다."
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
                  {relatedSources.length === 0 ? (
                    <AdminTextBlock label="소스 상태">
                      현재 이 편집 축에 직접 연결된 추가 소스가 없습니다.
                    </AdminTextBlock>
                  ) : null}
                </div>
              </AdminPanel>
            </AdminMotionSection>

            <AdminMotionSection delay={0.16}>
              <AdminPanel tone="soft" className="px-5 py-5">
                <AdminSectionTitle
                  eyebrow="Delivery Gaps"
                  title="관련 전달 실패"
                  description="같은 축에서 반복되는 설명 실패 신호를 같이 보면, 편집 우선순위가 더 선명해집니다."
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
                </div>
              </AdminPanel>
            </AdminMotionSection>
          </div>
        </div>

        <AdminMotionSection delay={0.2}>
          <AdminPanel tone="feature" className="px-6 py-6">
            <AdminSectionTitle
              eyebrow="Checklist"
              title="편집 전에 보는 체크리스트"
              description="노드와 엣지를 고치기 전에 학생 추적과 수업 전달 관점에서 한 번 더 보는 기준입니다."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                "학생 누수 카드에서 반복되는 연결을 먼저 확인했는가",
                "자동 추출 노드가 사건 목록처럼 흩어져 있지는 않은가",
                "편집 후 학생별 추적 단위가 더 선명해지는가",
              ].map((item) => (
                <AdminTextBlock key={item} label="편집 기준">
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

export default function AdminOntologyPage() {
  return (
    <Suspense fallback={<AdminShell><div /></AdminShell>}>
      <AdminOntologyPageContent />
    </Suspense>
  );
}
