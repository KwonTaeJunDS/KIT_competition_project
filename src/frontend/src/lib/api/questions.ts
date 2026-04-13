import { QuestionListItem, QuestionDetail, QuestionListResponse } from "../types/api";
import { USE_MOCK, fetchApi } from "./client";
import { mockQuestionDetail, mockQuestions } from "../mock/questions";

export interface GetQuestionsOptions {
  topic?: string;
  era?: string;
  userId?: string;
  limit?: number;
  excludeAttempted?: boolean;
  excludeQuestionIds?: string[];
  shuffle?: boolean;
}

export async function getQuestions(options: GetQuestionsOptions = {}): Promise<QuestionListItem[]> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockQuestions), 500);
    });
  }

  const params = new URLSearchParams();
  if (options.topic) params.set("topic", options.topic);
  if (options.era) params.set("era", options.era);
  if (options.userId) params.set("user_id", options.userId);
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  if (options.excludeAttempted) params.set("exclude_attempted", "true");
  if (options.shuffle) params.set("shuffle", "true");
  options.excludeQuestionIds?.forEach((questionId) => {
    if (questionId) {
      params.append("exclude_question_ids", questionId);
    }
  });

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await fetchApi<QuestionListResponse>(`/api/v1/questions${query}`);
  return data.questions;
}

export async function getQuestionDetail(id: string): Promise<QuestionDetail> {
  if (USE_MOCK) {
    if (id === mockQuestionDetail.id) return mockQuestionDetail;

    const q = mockQuestions.find((item) => item.id === id) || mockQuestions[0];
    return { ...mockQuestionDetail, ...q };
  }

  return fetchApi<QuestionDetail>(`/api/v1/questions/${id}`);
}
