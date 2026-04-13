export type AdminSummaryCard = {
  label: string;
  value: string;
  detail: string;
  tone: "rose" | "amber" | "emerald" | "blue";
};

export type AtRiskStudent = {
  id: string;
  name: string;
  className: string;
  currentEra: string;
  brokenFlows: number;
  overdueReviews: number;
  reviewDelayDays: number;
  weakLink: string;
  axisTag: string;
  leakCategory: "반복 누수 축 있음" | "개념 연결 불안정" | "시대 흐름 누락";
  missedTeaching: string;
  nextTeachingMove: string;
  recommendedAction: string;
  actionType: "ontology" | "explain" | "review" | "observe";
  recentStatus: "재실패" | "신규" | "진행 중" | "안정";
  risk: "높음" | "중간" | "관찰";
};

export type OntologyEditTask = {
  id: string;
  title: string;
  era: string;
  source: string;
  issue: string;
  nodes: number;
  edges: number;
  editingGoal: string;
  studentImpactIds: string[];
  nodesPreview: {
    id: string;
    label: string;
    role: string;
    note: string;
  }[];
  edgesPreview: {
    from: string;
    to: string;
    label: string;
    status: "유지" | "보강" | "추가";
  }[];
};

export type DeliveryGap = {
  title: string;
  detail: string;
  affectedStudents: number;
  relatedTaskId: string;
};

export type HotspotCluster = {
  title: string;
  era: string;
  affectedStudents: number;
  signal: string;
  recommendedAction: string;
};

export type SourceQueueItem = {
  title: string;
  status: string;
  note: string;
  relatedTaskId: string;
};

export type StudentLeakDetail = {
  id: string;
  summary: string;
  riskLabel: string;
  teacherFocus: string;
  recommendedOntologyTaskId: string;
  brokenChains: {
    title: string;
    era: string;
    chain: [string, string, string];
    whyItBreaks: string;
    examAxis: string;
  }[];
  reviewSignals: {
    title: string;
    status: string;
    note: string;
  }[];
  interventions: {
    date: string;
    type: string;
    action: string;
    result: string;
  }[];
  teacherNotes: string[];
};

export const ADMIN_SUMMARY: AdminSummaryCard[] = [
  { label: "집중 관리 학생", value: "7명", detail: "오늘 바로 살펴볼 학생", tone: "rose" },
  { label: "전달 실패 후보", value: "11개", detail: "설명이 비어 있는 연결", tone: "amber" },
  { label: "편집 대기 노드", value: "18개", detail: "관계 검토가 필요한 개념", tone: "blue" },
  { label: "이번 주 안정권", value: "13명", detail: "흐름이 비교적 안정적", tone: "emerald" },
];

export const AT_RISK_STUDENTS: AtRiskStudent[] = [
  {
    id: "student-kim",
    name: "김철수",
    className: "고1 A반",
    currentEra: "일제강점기",
    brokenFlows: 4,
    overdueReviews: 5,
    reviewDelayDays: 6,
    weakLink: "토지 조사 사업 -> 회사령 -> 민족 경제 압박",
    axisTag: "경제 침탈 축",
    leakCategory: "반복 누수 축 있음",
    missedTeaching: "경제 침탈은 기억하지만 정책 간 연결이 약합니다.",
    nextTeachingMove: "경제 침탈을 하나의 흐름으로 다시 설명하기",
    recommendedAction: "관계망 수정 후보",
    actionType: "ontology",
    recentStatus: "재실패",
    risk: "높음",
  },
  {
    id: "student-park",
    name: "박영희",
    className: "고1 A반",
    currentEra: "고려",
    brokenFlows: 3,
    overdueReviews: 2,
    reviewDelayDays: 3,
    weakLink: "거란 대응 -> 송과의 관계 -> 외교 균형",
    axisTag: "고려 대외 관계 축",
    leakCategory: "개념 연결 불안정",
    missedTeaching: "대외 관계를 사건별로는 기억하지만 구조가 약합니다.",
    nextTeachingMove: "대외 관계를 축으로 다시 묶어 설명하기",
    recommendedAction: "구조도 다시 설명",
    actionType: "explain",
    recentStatus: "신규",
    risk: "중간",
  },
  {
    id: "student-lee",
    name: "이민수",
    className: "고1 B반",
    currentEra: "조선후기",
    brokenFlows: 2,
    overdueReviews: 4,
    reviewDelayDays: 8,
    weakLink: "성리학 비판 -> 실학 -> 사회 개혁 인식",
    axisTag: "실학 등장 배경 축",
    leakCategory: "개념 연결 불안정",
    missedTeaching: "실학자를 외우지만 왜 등장했는지가 약합니다.",
    nextTeachingMove: "실학의 등장 배경을 생활 변화와 묶어 설명하기",
    recommendedAction: "복습 재배정 필요",
    actionType: "review",
    recentStatus: "진행 중",
    risk: "중간",
  },
  {
    id: "student-jung",
    name: "정다은",
    className: "고1 B반",
    currentEra: "삼국",
    brokenFlows: 2,
    overdueReviews: 1,
    reviewDelayDays: 1,
    weakLink: "고구려 수·당 전쟁 -> 백제·신라 경쟁 -> 통일 과정",
    axisTag: "통일 과정 축",
    leakCategory: "시대 흐름 누락",
    missedTeaching: "전쟁 순서는 기억하지만 경쟁 구도가 흐립니다.",
    nextTeachingMove: "전쟁과 통일을 한 장의 구조도로 다시 설명하기",
    recommendedAction: "관찰 유지",
    actionType: "observe",
    recentStatus: "안정",
    risk: "관찰",
  },
];

export const ONTOLOGY_EDIT_TASKS: OntologyEditTask[] = [
  {
    id: "economic-exploitation",
    title: "경제 침탈 노드 정리",
    era: "일제강점기",
    source: "3월 학습지 정답 해설",
    issue: "정책 노드가 따로 분리되어 학생 추적이 끊겨 있습니다.",
    nodes: 5,
    edges: 7,
    editingGoal: "정책 -> 생활 변화 -> 저항의 구조를 한 축으로 다시 묶기",
    studentImpactIds: ["student-kim"],
    nodesPreview: [
      { id: "policy", label: "식민지 경제 정책", role: "상위 축", note: "정책군을 하나의 상위 노드로 묶습니다." },
      { id: "land", label: "토지 조사 사업", role: "핵심 정책", note: "토지 수탈의 출발점으로 유지합니다." },
      { id: "company", label: "회사령", role: "산업 통제", note: "산업 왜곡으로 바로 이어지게 보강합니다." },
      { id: "life", label: "생활 압박", role: "학생 추적 노드", note: "학생이 체감하는 생활 변화와 연결합니다." },
      { id: "resist", label: "민족 저항", role: "결과 축", note: "경제 침탈이 저항으로 이어지는 구조를 닫습니다." },
    ],
    edgesPreview: [
      { from: "식민지 경제 정책", to: "토지 조사 사업", label: "구체화", status: "유지" },
      { from: "토지 조사 사업", to: "회사령", label: "경제 통제 심화", status: "보강" },
      { from: "회사령", to: "생활 압박", label: "생활 기반 약화", status: "추가" },
      { from: "생활 압박", to: "민족 저항", label: "저항 촉발", status: "보강" },
    ],
  },
  {
    id: "goryeo-diplomacy",
    title: "고려 대외 관계 축 재배치",
    era: "고려",
    source: "중간고사 PDF",
    issue: "거란, 여진, 송 노드가 시대 흐름보다 사건형으로만 연결되어 있습니다.",
    nodes: 4,
    edges: 6,
    editingGoal: "거란 대응 -> 송과의 관계 -> 외교 균형의 흐름을 하나의 관계 축으로 재배치",
    studentImpactIds: ["student-park"],
    nodesPreview: [
      { id: "khitan", label: "거란 대응", role: "대외 위기", note: "전쟁이 아니라 외교 판단의 시작점으로 둡니다." },
      { id: "song", label: "송과의 관계", role: "균형 축", note: "대등 외교의 의미를 분리하지 않습니다." },
      { id: "jurchen", label: "여진 대응", role: "전환", note: "시기별 대응 차이를 연결합니다." },
      { id: "balance", label: "외교 균형", role: "상위 개념", note: "학생 추적의 중심 노드로 승격합니다." },
    ],
    edgesPreview: [
      { from: "거란 대응", to: "외교 균형", label: "출발", status: "보강" },
      { from: "송과의 관계", to: "외교 균형", label: "균형 유지", status: "유지" },
      { from: "여진 대응", to: "외교 균형", label: "전환 판단", status: "추가" },
    ],
  },
  {
    id: "late-joseon-silhak",
    title: "조선후기 실학 계열 정리",
    era: "조선후기",
    source: "서술형 채점지",
    issue: "실학자별 설명은 있으나 배경과 목적을 잇는 엣지가 부족합니다.",
    nodes: 6,
    edges: 8,
    editingGoal: "성리학 비판 -> 현실 개혁 -> 사회 인식 변화의 흐름을 인물보다 앞에 두기",
    studentImpactIds: ["student-lee"],
    nodesPreview: [
      { id: "critique", label: "성리학 비판", role: "배경", note: "실학이 왜 나왔는지의 시작점입니다." },
      { id: "reality", label: "현실 인식", role: "문제의식", note: "생활 변화와 연결합니다." },
      { id: "reform", label: "개혁안", role: "실천", note: "토지, 상공업, 기술 인식으로 확장합니다." },
      { id: "change", label: "사회 변화", role: "결과", note: "학생이 실학의 방향성을 기억하게 합니다." },
    ],
    edgesPreview: [
      { from: "성리학 비판", to: "현실 인식", label: "문제의식 형성", status: "유지" },
      { from: "현실 인식", to: "개혁안", label: "개혁 구상", status: "보강" },
      { from: "개혁안", to: "사회 변화", label: "변화 지향", status: "추가" },
    ],
  },
];

export const DELIVERY_GAPS: DeliveryGap[] = [
  {
    title: "정책은 기억하지만 인과는 놓침",
    detail: "일제강점기 경제 정책군에서 반복되는 패턴입니다.",
    affectedStudents: 6,
    relatedTaskId: "economic-exploitation",
  },
  {
    title: "시대 흐름보다 사건 암기에 치우침",
    detail: "삼국과 고려 단원에서 공통으로 보입니다.",
    affectedStudents: 5,
    relatedTaskId: "goryeo-diplomacy",
  },
  {
    title: "실학의 배경 설명이 전달되지 않음",
    detail: "조선후기 단원에서 개혁 의도가 약하게 남습니다.",
    affectedStudents: 4,
    relatedTaskId: "late-joseon-silhak",
  },
];

export const HOTSPOT_CLUSTERS: HotspotCluster[] = [
  {
    title: "경제 침탈 구조",
    era: "일제강점기",
    affectedStudents: 12,
    signal: "토지 조사 사업과 회사령 사이를 자주 놓칩니다.",
    recommendedAction: "정책 -> 생활 변화 -> 민족 경제 압박 순서로 재설명",
  },
  {
    title: "고려 외교 균형",
    era: "고려",
    affectedStudents: 8,
    signal: "거란 대응은 기억하지만 송과의 관계가 빠집니다.",
    recommendedAction: "대외 관계를 한 축으로 묶어 지도형으로 재정리",
  },
  {
    title: "조선후기 실학의 등장 배경",
    era: "조선후기",
    affectedStudents: 7,
    signal: "실학자를 외우지만 성리학 비판과 현실 개혁의 연결이 약합니다.",
    recommendedAction: "배경 -> 문제의식 -> 개혁안 흐름으로 다시 설명",
  },
];

export const SOURCE_QUEUE: SourceQueueItem[] = [
  {
    title: "중간고사 대비 PDF",
    status: "자동 추출 완료",
    note: "후보 노드 23개, 검토 필요 6개",
    relatedTaskId: "goryeo-diplomacy",
  },
  {
    title: "서술형 정답지",
    status: "관계 검토 필요",
    note: "실학 관련 엣지 4개 누락 가능",
    relatedTaskId: "late-joseon-silhak",
  },
  {
    title: "보충 수업 프린트",
    status: "업로드 대기",
    note: "학생별 전달 실패 지점에 연결 예정",
    relatedTaskId: "economic-exploitation",
  },
];

export const STUDENT_LEAK_DETAILS: StudentLeakDetail[] = [
  {
    id: "student-kim",
    summary: "경제 침탈 정책은 기억하지만, 정책이 생활 변화와 저항으로 이어지는 구조가 아직 약합니다.",
    riskLabel: "일제강점기 흐름 복원이 우선",
    teacherFocus: "정책 이름 암기에서 멈추지 않고 생활 기반 변화와 민족 저항으로 연결해 다시 설명해야 합니다.",
    recommendedOntologyTaskId: "economic-exploitation",
    brokenChains: [
      {
        title: "경제 침탈 구조",
        era: "일제강점기",
        chain: ["토지 조사 사업", "회사령", "민족 경제 압박"],
        whyItBreaks: "정책 이름은 기억하지만 산업 통제와 생활 변화가 중간에서 빠집니다.",
        examAxis: "정책 -> 생활 변화 -> 저항",
      },
      {
        title: "민족 운동 연결",
        era: "일제강점기",
        chain: ["경제 침탈", "생활 위기", "민족 운동"],
        whyItBreaks: "저항을 별도 사건으로 외워 인과가 끊깁니다.",
        examAxis: "침탈 -> 위기 -> 저항",
      },
    ],
    reviewSignals: [
      { title: "복습 5건 밀림", status: "주의", note: "경제 정책군 복습이 계속 뒤로 밀리고 있습니다." },
      { title: "오답 3회 반복", status: "집중", note: "회사령과 산미 증식 계획을 혼동합니다." },
      { title: "서술형 연결 약함", status: "관찰", note: "정책 간 관계를 문장으로 설명할 때 중간 단계가 빠집니다." },
    ],
    interventions: [
      {
        date: "4월 8일",
        type: "개별 설명",
        action: "경제 침탈 구조를 정책 순서 중심으로 다시 설명함",
        result: "정책 이름 회상은 좋아졌지만 생활 변화 연결은 아직 약함",
      },
      {
        date: "4월 10일",
        type: "복습 과제",
        action: "학생 화면에 경제 침탈 복습 묶음 5건 배정",
        result: "복습 시작은 했지만 회사령 이후 연결에서 다시 멈춤",
      },
    ],
    teacherNotes: [
      "정책 이름을 다시 외우게 하기보다 생활 변화 도식부터 보여주는 것이 효과적입니다.",
      "학생 화면의 끊긴 연결 카드를 같이 열어두고 설명하면 전달력이 더 높습니다.",
    ],
  },
  {
    id: "student-park",
    summary: "고려 대외 관계를 사건별로는 기억하지만 외교 균형이라는 큰 축으로 아직 묶지 못하고 있습니다.",
    riskLabel: "고려 외교 축 재정리가 필요",
    teacherFocus: "거란, 송, 여진을 각각 설명하는 대신 하나의 외교 균형 구조로 다시 묶어 설명해야 합니다.",
    recommendedOntologyTaskId: "goryeo-diplomacy",
    brokenChains: [
      {
        title: "외교 균형 감각",
        era: "고려",
        chain: ["거란 대응", "송과의 관계", "외교 균형"],
        whyItBreaks: "전쟁 사건은 기억하지만 외교 판단의 중심축이 약합니다.",
        examAxis: "대외 위기 -> 관계 조정 -> 균형",
      },
      {
        title: "여진 대응 전환",
        era: "고려",
        chain: ["거란 이후 정세", "여진 대응", "대외 관계 변화"],
        whyItBreaks: "시기 전환을 사건별로 끊어 암기합니다.",
        examAxis: "정세 변화 -> 대응 -> 외교 재편",
      },
    ],
    reviewSignals: [
      { title: "복습 2건 밀림", status: "관찰", note: "송과의 관계 문제에서 자주 멈춥니다." },
      { title: "개념 설명 부족", status: "주의", note: "균형 외교를 한 줄로 말하지 못합니다." },
    ],
    interventions: [
      {
        date: "4월 7일",
        type: "보충 설명",
        action: "거란, 송, 여진을 외교 축으로 다시 묶는 미니 강의 진행",
        result: "거란 대응은 안정됐지만 송과의 관계가 여전히 분리되어 있음",
      },
    ],
    teacherNotes: [
      "지도형 구조로 묶어 설명하면 학생이 대외 관계를 더 오래 기억합니다.",
    ],
  },
  {
    id: "student-lee",
    summary: "실학자를 외우지만 왜 실학이 등장했는지의 배경과 문제의식을 아직 구조로 붙잡지 못하고 있습니다.",
    riskLabel: "조선후기 전환 흐름 재구성",
    teacherFocus: "인물 암기를 줄이고 성리학 비판, 현실 인식, 개혁안으로 이어지는 흐름을 먼저 잡아줘야 합니다.",
    recommendedOntologyTaskId: "late-joseon-silhak",
    brokenChains: [
      {
        title: "실학의 등장 배경",
        era: "조선후기",
        chain: ["성리학 비판", "현실 인식", "실학"],
        whyItBreaks: "인물은 기억하지만 등장 배경이 빠집니다.",
        examAxis: "비판 -> 문제의식 -> 실학",
      },
      {
        title: "개혁안의 방향",
        era: "조선후기",
        chain: ["실학", "개혁안", "사회 변화 인식"],
        whyItBreaks: "개혁안을 생활 변화와 연결하지 못합니다.",
        examAxis: "사상 -> 개혁 -> 변화",
      },
    ],
    reviewSignals: [
      { title: "오답 2회 반복", status: "주의", note: "중농학파와 중상학파의 배경 차이를 헷갈립니다." },
      { title: "복습 4건 밀림", status: "집중", note: "실학 관련 서술형 복습이 계속 미뤄집니다." },
    ],
    interventions: [
      {
        date: "4월 5일",
        type: "서술형 피드백",
        action: "실학의 등장 배경을 중심으로 답안 첨삭",
        result: "인물 분류는 나아졌지만 개혁 목적 설명은 여전히 짧음",
      },
    ],
    teacherNotes: [
      "실학자를 인물표로 보기 전에 흐름 도식으로 먼저 다시 보여주는 것이 좋습니다.",
    ],
  },
  {
    id: "student-jung",
    summary: "삼국 경쟁과 통일 과정을 사건 순서로는 기억하지만 경쟁 구도와 통일의 의미를 하나의 흐름으로 아직 보지 못합니다.",
    riskLabel: "삼국 경쟁 구도 보완",
    teacherFocus: "전쟁 순서보다 경쟁 구도와 통일의 방향성을 한 장의 그림으로 다시 설명할 필요가 있습니다.",
    recommendedOntologyTaskId: "goryeo-diplomacy",
    brokenChains: [
      {
        title: "삼국 경쟁 구도",
        era: "삼국",
        chain: ["고구려 수·당 전쟁", "백제·신라 경쟁", "통일 과정"],
        whyItBreaks: "전쟁과 경쟁의 맥락이 분리돼 보입니다.",
        examAxis: "대외 전쟁 -> 삼국 경쟁 -> 통일",
      },
    ],
    reviewSignals: [
      { title: "복습 1건 밀림", status: "관찰", note: "삼국 통일 단원은 복습이 적지만 연결이 약합니다." },
    ],
    interventions: [
      {
        date: "4월 9일",
        type: "질문 점검",
        action: "삼국 경쟁 구도를 구술로 다시 물어봄",
        result: "전쟁 순서는 맞지만 경쟁 구도 설명은 여전히 짧음",
      },
    ],
    teacherNotes: [
      "통일의 과정과 의미를 두 층으로 나눠 설명하면 이해가 좋아질 수 있습니다.",
    ],
  },
];

export function getStudentLeakDetail(studentId: string) {
  const student = AT_RISK_STUDENTS.find((item) => item.id === studentId);
  const detail = STUDENT_LEAK_DETAILS.find((item) => item.id === studentId);

  if (!student || !detail) return null;

  return {
    ...student,
    ...detail,
  };
}

export function getOntologyTask(taskId: string) {
  return ONTOLOGY_EDIT_TASKS.find((task) => task.id === taskId) ?? null;
}
