import { TodayData } from "../types/api";
import { USE_MOCK } from "./client";
import { mockTodayData } from "../mock/today";
import { fetchApi } from "./client";

export async function getTodayData(userId: string): Promise<TodayData> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockTodayData), 500);
    });
  }
  return fetchApi<TodayData>(`/api/v1/today?user_id=${userId}`);
}
