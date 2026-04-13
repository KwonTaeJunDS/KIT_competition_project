import { QuestionListItem, QuestionDetail } from "../types/api";

export const mockQuestions: QuestionListItem[] = [
  {
    id: "q001",
    round: 65,
    q_num: 1,
    stem: "다음 유물이 사용된 시대에 대한 설명으로 옳은 것은?",
    era_tags: ["선사"],
    concept_tags: ["유물"],
    score: 2,
  },
  {
    id: "q002",
    round: 65,
    q_num: 2,
    stem: "(가) 나라에 대한 설명으로 옳은 것은?",
    era_tags: ["삼국"],
    concept_tags: ["국가"],
    score: 1,
  },
];

export const mockQuestionDetail: QuestionDetail = {
  id: "q001",
  round: 65,
  q_num: 1,
  stem: "다음 유물이 사용된 시대에 대한 설명으로 옳은 것은? <br/> [사진: 주먹도끼, 슴베찌르개]",
  choices: [
    { key: "①", text: "동굴이나 막집에서 거주하였다." },
    { key: "②", text: "가락바퀴를 이용하여 실을 뽑았다." },
    { key: "③", text: "반달 돌칼을 사용하여 곡식을 수확하였다." },
    { key: "④", text: "거푸집을 이용하여 청동 검을 제작하였다." },
    { key: "⑤", text: "농경과 정착 생활이 시작되었다." },
  ],
  score: 2,
  era_tags: ["선사"],
  concept_tags: ["유물"],
  source: "제65회 한국사능력검정시험",
};
