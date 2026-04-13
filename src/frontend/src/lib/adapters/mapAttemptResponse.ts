import { AttemptResponse } from "../types/api";

/**
 * Maps raw Attempt response to UI-friendly Result model.
 * Preserves nulls; UI handles fallbacks.
 */
export function mapAttemptResponse(apiData: AttemptResponse) {
  return {
    isCorrect: apiData.is_correct,
    correctAnswer: apiData.correct_answer,
    answerText: apiData.answer_text,
    explanation: apiData.explanation_summary,
    errorType: apiData.error_type,
    wrongUnits: apiData.wrong_units ?? [],
    whyWrong: apiData.why_wrong,
    correctFact: apiData.correct_fact,
    memoryHint: apiData.memory_hint,
    noteSaved: apiData.note_saved,
    noteId: apiData.note_id,
  };
}
