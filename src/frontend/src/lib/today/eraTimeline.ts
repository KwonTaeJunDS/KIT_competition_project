import { TodayData } from "@/lib/types/api";
import {
  KoreanHistoryEraKey,
  KoreanHistoryEraTheme,
  getHistoricalEraThemes,
  resolveEraTheme,
} from "@/lib/theme/era";

export interface EraTimelineItem {
  theme: KoreanHistoryEraTheme;
  rangeLabel: string;
  progress: number;
  studiedCount: number;
  targetCount: number;
  reviewDue: number;
  streakDays: number;
  statusLabel: string;
  masteryLabel: string;
  isFocus: boolean;
}

const RANGE_LABEL_BY_ERA: Record<KoreanHistoryEraKey, string> = {
  prehistoric: "기원전 70만년 - 기원전 10세기",
  gojoseon: "기원전 2333 - 기원전 108",
  threeKingdoms: "기원전 57 - 668",
  northSouthStates: "698 - 936",
  goryeo: "918 - 1392",
  joseonEarly: "1392 - 1598",
  joseonLate: "1598 - 1863",
  modern: "1863 - 1910",
  occupation: "1910 - 1945",
  contemporary: "1945 - 현재",
  unknown: "정리 중",
};

const TARGET_COUNT_BY_ERA: Record<KoreanHistoryEraKey, number> = {
  prehistoric: 6,
  gojoseon: 5,
  threeKingdoms: 49,
  northSouthStates: 18,
  goryeo: 52,
  joseonEarly: 52,
  joseonLate: 50,
  modern: 52,
  occupation: 47,
  contemporary: 28,
  unknown: 12,
};

const BASE_PROGRESS_BY_ERA: Record<KoreanHistoryEraKey, number> = {
  prehistoric: 78,
  gojoseon: 64,
  threeKingdoms: 57,
  northSouthStates: 61,
  goryeo: 48,
  joseonEarly: 72,
  joseonLate: 43,
  modern: 55,
  occupation: 39,
  contemporary: 67,
  unknown: 42,
};

const BASE_REVIEW_BY_ERA: Record<KoreanHistoryEraKey, number> = {
  prehistoric: 1,
  gojoseon: 1,
  threeKingdoms: 4,
  northSouthStates: 2,
  goryeo: 5,
  joseonEarly: 3,
  joseonLate: 6,
  modern: 4,
  occupation: 7,
  contemporary: 2,
  unknown: 1,
};

const BASE_STREAK_BY_ERA: Record<KoreanHistoryEraKey, number> = {
  prehistoric: 8,
  gojoseon: 5,
  threeKingdoms: 10,
  northSouthStates: 6,
  goryeo: 4,
  joseonEarly: 11,
  joseonLate: 3,
  modern: 6,
  occupation: 2,
  contemporary: 9,
  unknown: 3,
};

function clampProgress(value: number) {
  return Math.max(12, Math.min(96, value));
}

function getStatusLabel(progress: number, isFocus: boolean) {
  if (isFocus) return "집중 보완";
  if (progress >= 78) return "안정권";
  if (progress >= 58) return "회독 중";
  return "보강 필요";
}

function getMasteryLabel(progress: number, reviewDue: number) {
  if (progress >= 82 && reviewDue <= 2) return "흐름 고정";
  if (progress >= 64) return "개념 연결";
  if (progress >= 46) return "암기 보강";
  return "기초 재정리";
}

export function buildEraTimeline(todayData: TodayData): EraTimelineItem[] {
  const focusEraKeys = new Set(
    todayData.weak_topics.map((topic) => resolveEraTheme(topic).key),
  );
  const totalDailyLoad = todayData.today_new_count + todayData.today_review_count;

  return getHistoricalEraThemes().map((theme, index) => {
    const isFocus = focusEraKeys.has(theme.key);
    const progress = clampProgress(
      BASE_PROGRESS_BY_ERA[theme.key] +
        (totalDailyLoad > 14 ? 3 : 0) -
        (isFocus ? 12 : 0) +
        (index % 2 === 0 ? 2 : 0),
    );
    const targetCount = TARGET_COUNT_BY_ERA[theme.key];
    const studiedCount = Math.max(1, Math.round((targetCount * progress) / 100));
    const reviewDue = BASE_REVIEW_BY_ERA[theme.key] + (isFocus ? 3 : 0);
    const streakDays = Math.max(
      1,
      BASE_STREAK_BY_ERA[theme.key] + (isFocus ? -1 : 0),
    );

    return {
      theme,
      rangeLabel: RANGE_LABEL_BY_ERA[theme.key],
      progress,
      studiedCount,
      targetCount,
      reviewDue,
      streakDays,
      statusLabel: getStatusLabel(progress, isFocus),
      masteryLabel: getMasteryLabel(progress, reviewDue),
      isFocus,
    };
  });
}
