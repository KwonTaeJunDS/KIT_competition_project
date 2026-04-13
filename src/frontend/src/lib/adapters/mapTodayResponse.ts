import { TodayData } from "../types/api";

/**
 * Maps raw Today API response to UI-friendly model.
 * Preserves nulls; UI should handle fallbacks.
 */
export function mapTodayResponse(apiData: TodayData) {
  return {
    reviewCount: apiData.today_review_count,
    newCount: apiData.today_new_count,
    weakTopics: apiData.weak_topics ?? [],
  };
}
