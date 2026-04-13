import { AttemptResponse } from "../types/api";

export const mockAttemptResponse: AttemptResponse = {
  is_correct: false,
  correct_answer: "①",
  answer_text: "동굴이나 막집에서 거주하였다.",
  explanation_summary: "주석도끼와 슴베찌르개는 구석기 시대의 대표적인 유물입니다. 구석기 시대 사람들은 이동 생활을 하며 동굴이나 막집에 거주했습니다.",
  error_type: "개념 혼동",
  wrong_units: ["구석기 생활상"],
  why_wrong: "신석기 시대의 특징인 '가락바퀴'와 혼동하기 쉽습니다.",
  correct_fact: "구석기 시대 = 주먹도끼, 이동 생활, 동굴/막집 거주",
  memory_hint: "구(석기) - 동(굴) / 신(석기) - 움(집)",
  note_saved: true,
  note_id: "note001",
};

export const mockCorrectAttemptResponse: AttemptResponse = {
  is_correct: true,
  correct_answer: "①",
  answer_text: "동굴이나 막집에서 거주하였다.",
  explanation_summary: "정답입니다! 주먹도끼는 구석기 시대의 대표적 도구입니다.",
  error_type: null,
  wrong_units: [],
  why_wrong: null,
  correct_fact: "구석기 시대는 이동 생활과 동굴 거주가 특징입니다.",
  memory_hint: "구석기-동굴",
  note_saved: false,
  note_id: null,
};
