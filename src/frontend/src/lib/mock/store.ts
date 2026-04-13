import { ErrorNoteItem, ReviewQueueItem, AttemptResponse, AttemptRequest } from "../types/api";
import { mockErrorNotes } from "./notes";
import { mockReviewQueue } from "./review";

/**
 * PHASE 1 PROOF-ONLY: A module singleton store for volatile mock state.
 * This is used to demonstrate the "Solve -> Note -> Review" connection
 * before actual backend integration.
 */
class MockStore {
  private notes: ErrorNoteItem[] = [...mockErrorNotes];
  private reviewQueue: ReviewQueueItem[] = [...mockReviewQueue];

  getNotes(): ErrorNoteItem[] {
    return this.notes;
  }

  getReviewQueue(): ReviewQueueItem[] {
    return this.reviewQueue;
  }

  /**
   * Appends to notes and review queue ONLY if the submission is incorrect.
   */
  async addAttempt(request: AttemptRequest, result: AttemptResponse) {
    if (!result.is_correct) {
      const newId = `new-note-${Date.now()}`;
      
      const newNote: ErrorNoteItem = {
        id: newId,
        question_id: request.question_id,
        question_stem: "방금 틀린 문제의 본문입니다 (Mock Store 증명)",
        my_answer: request.student_answer,
        correct_answer: result.correct_answer,
        why_wrong: result.why_wrong || "새로운 오답 분석 결과입니다.",
        correct_fact: result.correct_fact || "교정 지식 포인트",
        memory_hint: result.memory_hint || "연결 포인트",
        review_front: "이 개념의 핵심 포인트는 무엇일까요?",
        review_back: result.correct_fact || "교정 지식 포인트",
        era_tags: ["미분류"],
        created_at: new Date().toISOString(),
        error_type: result.error_type || "개념오해",
      };

      const newReview: ReviewQueueItem = {
        queue_id: `rev-${newId}`,
        note_id: newId,
        question_id: request.question_id,
        question_stem: newNote.question_stem,
        due_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
        review_count: 0,
        memory_hint: result.memory_hint || "연결 포인트",
        error_type: newNote.error_type,
      };

      this.notes = [newNote, ...this.notes];
      this.reviewQueue = [newReview, ...this.reviewQueue];
      
      console.log(`[MockStore] Note added: ${newId}`);
    }
  }

  reset() {
    this.notes = [...mockErrorNotes];
    this.reviewQueue = [...mockReviewQueue];
  }
}

export const mockStore = new MockStore();
