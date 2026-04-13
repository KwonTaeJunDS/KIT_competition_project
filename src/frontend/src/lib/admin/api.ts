import { USE_MOCK, fetchApi } from "@/lib/api/client";
import {
  ADMIN_SUMMARY,
  AT_RISK_STUDENTS,
  DELIVERY_GAPS,
  HOTSPOT_CLUSTERS,
  ONTOLOGY_EDIT_TASKS,
  SOURCE_QUEUE,
  STUDENT_LEAK_DETAILS,
  type AdminSummaryCard,
  type AtRiskStudent,
  type DeliveryGap,
  type HotspotCluster,
  type OntologyEditTask,
  type SourceQueueItem,
  type StudentLeakDetail,
} from "./mockDashboard";

const ONTOLOGY_DRAFT_STORAGE_KEY = "kit-admin-ontology-draft";

export type AdminDashboardData = {
  summaryCards: AdminSummaryCard[];
  students: AtRiskStudent[];
  ontologyTasks: OntologyEditTask[];
  deliveryGaps: DeliveryGap[];
  hotspotClusters: HotspotCluster[];
  sourceQueue: SourceQueueItem[];
  studentLeakDetails: StudentLeakDetail[];
};

export type OntologyDraftData = {
  taskId: string;
  title: string;
  era: string;
  nodesPreview: OntologyEditTask["nodesPreview"];
  edgesPreview: OntologyEditTask["edgesPreview"];
  updatedAt: string | null;
  storage: "api" | "local";
};

function readLocalDraftMap(): Record<string, OntologyDraftData> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ONTOLOGY_DRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OntologyDraftData>) : {};
  } catch (error) {
    console.error("[Admin ontology local read]", error);
    return {};
  }
}

function readLocalDraft(taskId: string): OntologyDraftData | null {
  const item = readLocalDraftMap()[taskId];
  if (!item) {
    return null;
  }

  return {
    ...item,
    storage: "local",
  };
}

function writeLocalDraft(draft: OntologyDraftData): OntologyDraftData {
  if (typeof window === "undefined") {
    return draft;
  }

  try {
    const nextMap = {
      ...readLocalDraftMap(),
      [draft.taskId]: {
        ...draft,
        storage: "local" as const,
      },
    };
    window.localStorage.setItem(ONTOLOGY_DRAFT_STORAGE_KEY, JSON.stringify(nextMap));
  } catch (error) {
    console.error("[Admin ontology local write]", error);
  }

  return {
    ...draft,
  };
}

export function getMockAdminDashboardData(): AdminDashboardData {
  return {
    summaryCards: structuredClone(ADMIN_SUMMARY),
    students: structuredClone(AT_RISK_STUDENTS),
    ontologyTasks: structuredClone(ONTOLOGY_EDIT_TASKS),
    deliveryGaps: structuredClone(DELIVERY_GAPS),
    hotspotClusters: structuredClone(HOTSPOT_CLUSTERS),
    sourceQueue: structuredClone(SOURCE_QUEUE),
    studentLeakDetails: structuredClone(STUDENT_LEAK_DETAILS),
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (USE_MOCK) {
    return getMockAdminDashboardData();
  }

  try {
    const data = await fetchApi<AdminDashboardData>("/api/v1/admin/dashboard-data");
    if (!data.students?.length) {
      return getMockAdminDashboardData();
    }
    return data;
  } catch (error) {
    console.error("[Admin API fallback]", error);
    return getMockAdminDashboardData();
  }
}

export function getAdminStudentLeakDetail(
  data: AdminDashboardData,
  studentId: string,
) {
  const student = data.students.find((item) => item.id === studentId);
  const detail = data.studentLeakDetails.find((item) => item.id === studentId);

  if (!student || !detail) {
    return null;
  }

  return {
    ...student,
    ...detail,
  };
}

export function getAdminOntologyTask(
  data: AdminDashboardData,
  taskId: string,
) {
  return data.ontologyTasks.find((task) => task.id === taskId) ?? null;
}

export async function getAdminOntologyDraft(
  taskId: string,
): Promise<OntologyDraftData | null> {
  if (USE_MOCK) {
    return readLocalDraft(taskId);
  }

  try {
    const data = await fetchApi<OntologyDraftData | null>(`/api/v1/admin/ontology-drafts/${taskId}`);
    if (data) {
      writeLocalDraft({
        ...data,
        storage: "local",
      });
      return data;
    }
  } catch (error) {
    console.error("[Admin ontology API fallback]", error);
  }

  return readLocalDraft(taskId);
}

export async function saveAdminOntologyDraft(
  taskId: string,
  payload: Pick<OntologyDraftData, "title" | "era" | "nodesPreview" | "edgesPreview">,
): Promise<OntologyDraftData> {
  const localDraft = writeLocalDraft({
    taskId,
    ...payload,
    updatedAt: new Date().toISOString(),
    storage: "local",
  });

  if (USE_MOCK) {
    return localDraft;
  }

  try {
    const data = await fetchApi<OntologyDraftData>(`/api/v1/admin/ontology-drafts/${taskId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    writeLocalDraft({
      ...data,
      storage: "local",
    });
    return data;
  } catch (error) {
    console.error("[Admin ontology save fallback]", error);
    return localDraft;
  }
}
