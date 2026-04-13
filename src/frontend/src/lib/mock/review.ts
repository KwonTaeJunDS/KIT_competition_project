import { ReviewQueueItem } from "../types/api";

export const mockReviewQueue: ReviewQueueItem[] = [
  {
    queue_id: "rev001",
    note_id: "note001",
    question_id: "q001",
    question_stem: "다음 유물이 사용된 시대에 대한 설명으로 옳은 것은?",
    due_at: "2024-04-10T23:54:00Z",
    review_count: 0,
    error_type: "개념 혼동",
    memory_hint: "구(석기) - 동(굴)",
  },
  {
    queue_id: "rev002",
    note_id: "note002",
    question_id: "q015",
    question_stem: "밑줄 친 '이 왕'의 업적으로 옳은 것은?",
    due_at: "2024-04-10T11:00:00Z",
    review_count: 1,
    error_type: "지식 부족",
    memory_hint: "성종 = 완성(성!)",
  },
];
