import { AttemptRequest, AttemptResponse } from "../types/api";
import { USE_MOCK, fetchApi } from "./client";
import { mockAttemptResponse, mockCorrectAttemptResponse } from "../mock/attempts";
import { mockStore } from "../mock/store";

export async function submitAttempt(request: AttemptRequest): Promise<AttemptResponse> {
  if (USE_MOCK) {
    const isCorrectChoice = request.student_answer === "①";
    const res = isCorrectChoice ? mockCorrectAttemptResponse : mockAttemptResponse;
    
    // Phase 1 Proof: Only incorrect answers update the notes/review chain
    await mockStore.addAttempt(request, res);
    return res;
  }
  return fetchApi<AttemptResponse>(`/api/v1/attempts`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}
