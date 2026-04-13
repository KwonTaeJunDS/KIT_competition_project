import { ReviewQueueItem, ReviewQueueListResponse, CompleteReviewRequest, CompleteReviewResponse } from "../types/api";
import { USE_MOCK, fetchApi } from "./client";
import { mockStore } from "../mock/store";

export async function getReviewQueue(userId: string, includeAll = false): Promise<ReviewQueueItem[]> {
  if (USE_MOCK) {
    return mockStore.getReviewQueue();
  }

  const params = new URLSearchParams({ user_id: userId });
  if (includeAll) {
    params.set("include_all", "true");
  }

  const data = await fetchApi<ReviewQueueListResponse>(`/api/v1/review-queue?${params.toString()}`);
  return data.items;
}

export async function completeReview(queueId: string, result: CompleteReviewRequest): Promise<CompleteReviewResponse> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          queue_id: queueId,
          next_due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
          review_count: 1,
          status: "pending"
        });
      }, 500);
    });
  }

  return fetchApi<CompleteReviewResponse>(`/api/v1/review-queue/${queueId}/complete`, {
    method: "POST",
    body: JSON.stringify(result),
  });
}
