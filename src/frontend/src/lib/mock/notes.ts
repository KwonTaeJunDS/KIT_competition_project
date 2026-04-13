import { ErrorNoteItem } from "../types/api";

export const mockErrorNotes: ErrorNoteItem[] = [
  {
    id: "note001",
    question_id: "q001",
    question_stem: "다음 유물이 사용된 시대에 대한 설명으로 옳은 것은?",
    my_answer: "②",
    correct_answer: "①",
    error_type: "개념 혼동",
    why_wrong: "신석기 시대의 특징인 '가락바퀴'와 혼동하기 쉽습니다.",
    correct_fact: "구석기 시대 = 주먹도끼, 이동 생활, 동굴/막집 거주",
    memory_hint: "구(석기) - 동(굴) / 신(석기) - 움(집)",
    review_front: "구석기 시대의 주거 형태는?",
    review_back: "동굴이나 막집 (이동 생활)",
    era_tags: ["선사"],
    created_at: "2024-04-10T23:54:00Z",
  },
  {
    id: "note002",
    question_id: "q015",
    question_stem: "밑줄 친 '이 왕'의 업적으로 옳은 것은?",
    my_answer: "④",
    correct_answer: "③",
    error_type: "지식 부족",
    why_wrong: "성종의 경국대전 완성과 세종의 공법을 구별하지 못함.",
    correct_fact: "성종은 경국대전을 반포하여 통치 체제를 정비하였다.",
    memory_hint: "성종 = 완성(성!)",
    review_front: "경국대전을 완성하고 반포한 왕은?",
    review_back: "성종",
    era_tags: ["조선전기"],
    created_at: "2024-04-09T10:20:00Z",
  },
];
