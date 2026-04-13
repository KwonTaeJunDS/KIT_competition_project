import type { KoreanHistoryEraKey } from "@/lib/theme/era";

export const HISTORY_DESK_CORE_TOKENS = {
  backgroundPrimary: "#0B0B0F",
  backgroundSecondary: "#121218",
  cardSurface: "#16161D",
  elevatedSurface: "#1B1B23",
  borderSubtle: "#2A2A33",
  borderStrong: "#3A3A46",
  textPrimary: "#F3F1EA",
  textSecondary: "#B8B4AA",
  textTertiary: "#8E8A82",
  focus: "#D2B36C",
  reviewDue: "#C96B4B",
  stable: "#6F8F72",
  warning: "#A14B4B",
} as const;

export interface HistoryDeskEraReference {
  key: KoreanHistoryEraKey;
  label: string;
  mapLabel: string;
  narrative: string;
  flowSummary: string;
  accent: string;
  weakConnectionExamples: string[];
  sourceRefs: Array<{
    label: string;
    url: string;
  }>;
}

export const HISTORY_DESK_ERA_REFERENCES: Record<
  Exclude<KoreanHistoryEraKey, "unknown">,
  HistoryDeskEraReference
> = {
  prehistoric: {
    key: "prehistoric",
    label: "선사",
    mapLabel: "형성",
    narrative: "도구와 생활 기반이 형성되는 구간",
    flowSummary: "정착, 생업, 초기 기술 변화가 이어지는 흐름",
    accent: "#7A6A58",
    weakConnectionExamples: ["구석기 -> 신석기 -> 청동기", "생활 방식 변화 -> 생산 기반 형성"],
    sourceRefs: [
      { label: "우리역사넷 한국사연대기", url: "https://contents.history.go.kr/front/kc/main.do" },
      { label: "우리역사넷 이미지 자료", url: "https://contents.history.go.kr/front/ki/main.do" },
    ],
  },
  gojoseon: {
    key: "gojoseon",
    label: "고조선",
    mapLabel: "질서 시작",
    narrative: "초기 국가 질서와 제천 문화가 드러나는 구간",
    flowSummary: "성립, 주변 여러 세력, 초기 국가 질서가 묶이는 흐름",
    accent: "#B08A4A",
    weakConnectionExamples: ["단군 신화 -> 성립 -> 8조법", "고조선 -> 여러 초기 국가"],
    sourceRefs: [
      { label: "우리역사넷 한국사연대기", url: "https://contents.history.go.kr/front/kc/main.do" },
      { label: "국립중앙박물관 소장품 검색", url: "https://www.museum.go.kr/site/main/relic/search/view?relicId=8365" },
    ],
  },
  threeKingdoms: {
    key: "threeKingdoms",
    label: "삼국",
    mapLabel: "경쟁",
    narrative: "왕권과 팽창 경쟁이 맞물리는 구간",
    flowSummary: "고구려, 백제, 신라, 가야의 충돌과 성장 흐름",
    accent: "#8E3B32",
    weakConnectionExamples: ["왕권 강화 -> 영토 확장 -> 전쟁", "삼국 경쟁 -> 통일 전개"],
    sourceRefs: [
      { label: "우리역사넷 한국사연대기", url: "https://contents.history.go.kr/front/kc/main.do" },
      { label: "우리역사넷 이미지 자료", url: "https://contents.history.go.kr/front/ki/main.do" },
    ],
  },
  northSouthStates: {
    key: "northSouthStates",
    label: "남북국",
    mapLabel: "병존",
    narrative: "통일 신라와 발해가 함께 놓이는 구간",
    flowSummary: "한쪽은 통일 질서, 한쪽은 북방 확장으로 읽는 흐름",
    accent: "#3D5A80",
    weakConnectionExamples: ["통일 신라 -> 골품 체제 -> 동요", "발해 -> 대외 관계 -> 해동성국"],
    sourceRefs: [
      { label: "우리역사넷 한국사연대기", url: "https://contents.history.go.kr/front/kc/main.do" },
      { label: "e뮤지엄", url: "https://www.emuseum.go.kr/index.html" },
    ],
  },
  goryeo: {
    key: "goryeo",
    label: "고려",
    mapLabel: "외교·균형",
    narrative: "외교와 균형 감각이 핵심인 구간",
    flowSummary: "거란, 여진, 몽골과의 관계 속 균형과 변동의 흐름",
    accent: "#3F8F83",
    weakConnectionExamples: ["거란 대응 -> 송과의 관계 -> 외교 균형", "문벌 -> 무신 -> 원 간섭기"],
    sourceRefs: [
      { label: "e뮤지엄", url: "https://www.emuseum.go.kr/index.html" },
      { label: "국립중앙박물관 소장품 검색", url: "https://www.museum.go.kr/site/main/relic/search/view?relicId=8365" },
    ],
  },
  joseonEarly: {
    key: "joseonEarly",
    label: "조선전기",
    mapLabel: "질서·정립",
    narrative: "제도와 법도가 정리되는 구간",
    flowSummary: "왕권, 유교 질서, 법전, 훈구와 사림의 구조가 정리되는 흐름",
    accent: "#C6B27A",
    weakConnectionExamples: ["경국대전 -> 유교 질서 -> 통치 체제", "훈구 -> 사림 -> 사화"],
    sourceRefs: [
      { label: "국립고궁박물관", url: "https://www.gogung.go.kr/gogung/main/main.do" },
      { label: "왕실문화도감 일러스트", url: "https://www.gogung.go.kr/gogung/pgm/psgudMng/view.do?psgudSn=439286&menuNo=800070" },
    ],
  },
  joseonLate: {
    key: "joseonLate",
    label: "조선후기",
    mapLabel: "동요·전환",
    narrative: "질서가 흔들리고 전환이 시작되는 구간",
    flowSummary: "실학, 세도 정치, 민란과 사회 변화가 묶이는 흐름",
    accent: "#8A6A43",
    weakConnectionExamples: ["성리학 비판 -> 현실 개혁 -> 실학", "세도 정치 -> 민란 -> 사회 동요"],
    sourceRefs: [
      { label: "국립고궁박물관", url: "https://www.gogung.go.kr/gogung/main/main.do" },
      { label: "우리역사넷 한국사연대기", url: "https://contents.history.go.kr/front/kc/main.do" },
    ],
  },
  modern: {
    key: "modern",
    label: "근대",
    mapLabel: "개항·충돌",
    narrative: "개항과 개혁, 충돌이 빠르게 겹치는 구간",
    flowSummary: "개항, 개화, 개혁, 외세 침투가 동시에 압박하는 흐름",
    accent: "#4F6D8A",
    weakConnectionExamples: ["개항 -> 개화 정책 -> 외세 충돌", "갑오개혁 -> 대한제국 -> 국권 피탈 전야"],
    sourceRefs: [
      { label: "대한민국역사박물관", url: "https://www.much.go.kr/" },
      { label: "근현대사 아카이브", url: "https://archive.much.go.kr" },
    ],
  },
  occupation: {
    key: "occupation",
    label: "일제강점기",
    mapLabel: "침탈·저항",
    narrative: "침탈이 저항을 낳는 구간",
    flowSummary: "경제 침탈, 문화 통치, 민족 운동이 강하게 맞물리는 흐름",
    accent: "#8A2E2E",
    weakConnectionExamples: ["토지 수탈 -> 산업 왜곡 -> 민족 경제 압박", "3·1 운동 -> 임시정부 -> 무장 독립 전개"],
    sourceRefs: [
      { label: "대한민국역사박물관", url: "https://www.much.go.kr/" },
      { label: "근현대사 아카이브", url: "https://archive.much.go.kr" },
    ],
  },
  contemporary: {
    key: "contemporary",
    label: "현대",
    mapLabel: "재편",
    narrative: "국가와 사회 질서가 재편되는 구간",
    flowSummary: "정부 수립, 산업화, 민주화, 남북 관계가 이어지는 흐름",
    accent: "#5A7FA6",
    weakConnectionExamples: ["정부 수립 -> 전쟁 -> 재건", "산업화 -> 민주화 -> 사회 재편"],
    sourceRefs: [
      { label: "대한민국역사박물관", url: "https://www.much.go.kr/" },
      { label: "한국민족문화대백과사전", url: "https://encykorea.aks.ac.kr/" },
    ],
  },
};

export function getHistoryDeskEraReference(
  key: Exclude<KoreanHistoryEraKey, "unknown">,
) {
  return HISTORY_DESK_ERA_REFERENCES[key];
}
