import type { CSSProperties } from "react";

export type KoreanHistoryEraKey =
  | "prehistoric"
  | "gojoseon"
  | "threeKingdoms"
  | "northSouthStates"
  | "goryeo"
  | "joseonEarly"
  | "joseonLate"
  | "modern"
  | "occupation"
  | "contemporary"
  | "unknown";

export interface KoreanHistoryEraTheme {
  key: KoreanHistoryEraKey;
  label: string;
  hanja: string;
  summary: string;
  aliases: string[];
  palette: {
    accent: string;
    accentSoft: string;
    border: string;
    surface: string;
    text: string;
    glow: string;
  };
}

const ERA_THEMES: KoreanHistoryEraTheme[] = [
  {
    key: "prehistoric",
    label: "선사",
    hanja: "",
    summary: "토기와 바위, 흙빛 질감",
    aliases: ["선사", "구석기", "신석기", "청동기", "철기"],
    palette: {
      accent: "#8a5a36",
      accentSoft: "#f4e5d7",
      border: "#d7b08f",
      surface: "#fdf7f1",
      text: "#5c3a22",
      glow: "rgba(138, 90, 54, 0.22)",
    },
  },
  {
    key: "gojoseon",
    label: "고조선",
    hanja: "",
    summary: "청동과 제천 문화의 금빛",
    aliases: ["고조선", "단군", "위만", "부여", "옥저", "동예", "삼한"],
    palette: {
      accent: "#a86f18",
      accentSoft: "#f8ecd2",
      border: "#d8b06c",
      surface: "#fef9ee",
      text: "#6b470d",
      glow: "rgba(168, 111, 24, 0.2)",
    },
  },
  {
    key: "threeKingdoms",
    label: "삼국",
    hanja: "",
    summary: "왕권과 전쟁의 주홍빛",
    aliases: ["삼국", "고구려", "백제", "신라", "가야"],
    palette: {
      accent: "#9b2c2c",
      accentSoft: "#f8dcdc",
      border: "#d99a9a",
      surface: "#fff5f5",
      text: "#631717",
      glow: "rgba(155, 44, 44, 0.2)",
    },
  },
  {
    key: "northSouthStates",
    label: "남북국",
    hanja: "",
    summary: "발해와 통일 신라의 청람",
    aliases: ["남북국", "발해", "통일신라", "통일 신라"],
    palette: {
      accent: "#225b89",
      accentSoft: "#dbeaf7",
      border: "#96b9da",
      surface: "#f1f7fc",
      text: "#173b5b",
      glow: "rgba(34, 91, 137, 0.18)",
    },
  },
  {
    key: "goryeo",
    label: "고려",
    hanja: "",
    summary: "청자와 불화의 비취색",
    aliases: ["고려", "태조 왕건", "광종", "무신", "공민왕"],
    palette: {
      accent: "#1f6b66",
      accentSoft: "#daf1ed",
      border: "#8fc5bc",
      surface: "#eef9f6",
      text: "#104743",
      glow: "rgba(31, 107, 102, 0.18)",
    },
  },
  {
    key: "joseonEarly",
    label: "조선전기",
    hanja: "",
    summary: "법전과 유교 질서의 먹빛",
    aliases: ["조선전기", "조선 전기", "태종", "세종", "성종", "훈구", "사림", "사화"],
    palette: {
      accent: "#43546f",
      accentSoft: "#e2e7ef",
      border: "#a9b4c4",
      surface: "#f6f8fb",
      text: "#273546",
      glow: "rgba(67, 84, 111, 0.18)",
    },
  },
  {
    key: "joseonLate",
    label: "조선후기",
    hanja: "",
    summary: "실학과 민란의 목판 갈색",
    aliases: ["조선후기", "조선 후기", "영조", "정조", "실학", "세도정치", "홍경래", "동학"],
    palette: {
      accent: "#7a5230",
      accentSoft: "#f3e6db",
      border: "#cfad92",
      surface: "#fcf6f1",
      text: "#51331b",
      glow: "rgba(122, 82, 48, 0.18)",
    },
  },
  {
    key: "modern",
    label: "근대",
    hanja: "",
    summary: "개항과 개혁의 강철 청색",
    aliases: ["근대", "개항", "흥선대원군", "갑신", "갑오", "을미", "독립협회", "대한제국", "애국계몽"],
    palette: {
      accent: "#2f6278",
      accentSoft: "#dcecf3",
      border: "#97bccc",
      surface: "#f3f9fb",
      text: "#1a4557",
      glow: "rgba(47, 98, 120, 0.18)",
    },
  },
  {
    key: "occupation",
    label: "일제강점기",
    hanja: "",
    summary: "저항과 억압의 적흑 대비",
    aliases: ["일제강점기", "일제 강점기", "3·1", "3.1", "임시정부", "광복군", "민족말살", "독립운동"],
    palette: {
      accent: "#8c1f1f",
      accentSoft: "#f8dddd",
      border: "#d6a2a2",
      surface: "#fff5f5",
      text: "#5a1515",
      glow: "rgba(140, 31, 31, 0.2)",
    },
  },
  {
    key: "contemporary",
    label: "현대",
    hanja: "",
    summary: "산업화와 민주화의 청백",
    aliases: ["현대", "광복 이후", "정부 수립", "4·19", "4.19", "5·18", "5.18", "민주화", "남북"],
    palette: {
      accent: "#0f6cbd",
      accentSoft: "#dcedff",
      border: "#97c7f2",
      surface: "#f3f9ff",
      text: "#0a477b",
      glow: "rgba(15, 108, 189, 0.18)",
    },
  },
  {
    key: "unknown",
    label: "미분류",
    hanja: "",
    summary: "중립적인 회청색",
    aliases: ["미분류"],
    palette: {
      accent: "#64748b",
      accentSoft: "#e2e8f0",
      border: "#cbd5e1",
      surface: "#f8fafc",
      text: "#334155",
      glow: "rgba(100, 116, 139, 0.16)",
    },
  },
];

export function getHistoricalEraThemes() {
  return ERA_THEMES.filter((theme) => theme.key !== "unknown");
}

function normalizeSource(input: string | string[] | null | undefined) {
  const joined = Array.isArray(input) ? input.join(" ") : input ?? "";
  return joined.replace(/\s+/g, "").toLowerCase();
}

export function resolveEraTheme(input: string | string[] | null | undefined) {
  const normalized = normalizeSource(input);

  for (const theme of ERA_THEMES) {
    if (
      theme.aliases.some((alias) =>
        normalized.includes(alias.replace(/\s+/g, "").toLowerCase()),
      )
    ) {
      return theme;
    }
  }

  return ERA_THEMES[ERA_THEMES.length - 1];
}

export function resolveDominantEraTheme(
  inputs: Array<string | string[] | null | undefined>,
) {
  const counts = new Map<KoreanHistoryEraKey, number>();

  inputs.forEach((input) => {
    const theme = resolveEraTheme(input);
    counts.set(theme.key, (counts.get(theme.key) ?? 0) + 1);
  });

  let winner = ERA_THEMES[ERA_THEMES.length - 1];
  let max = -1;

  for (const theme of ERA_THEMES) {
    const count = counts.get(theme.key) ?? 0;
    if (count > max) {
      max = count;
      winner = theme;
    }
  }

  return winner;
}

export function getEraStyleVars(theme: KoreanHistoryEraTheme): CSSProperties {
  return {
    ["--era-accent" as string]: theme.palette.accent,
    ["--era-accent-soft" as string]: theme.palette.accentSoft,
    ["--era-border" as string]: theme.palette.border,
    ["--era-surface" as string]: theme.palette.surface,
    ["--era-text" as string]: theme.palette.text,
    ["--era-glow" as string]: theme.palette.glow,
  };
}
