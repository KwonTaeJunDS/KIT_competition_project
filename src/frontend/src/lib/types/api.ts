/**
 * CORE API TYPES - Aligned with Backend Schemas
 */

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// 1. Today Dashboard
export interface TodayData {
  today_review_count: number;
  today_new_count: number;
  weak_topics: string[];
}

// 2. Questions
export interface ChoiceItem {
  key: string;
  text: string;
}

export interface QuestionListItem {
  id: string;
  round: number;
  q_num: number;
  stem: string;
  era_tags: string[];
  concept_tags: string[];
  score: number;
}

export interface QuestionListResponse {
  total_count: number;
  questions: QuestionListItem[];
}

export interface QuestionDetail extends QuestionListItem {
  choices: ChoiceItem[];
  source: string;
  hasImage?: boolean; // UI-specific extended field
}

// 3. Attempts (Solve Flow)
export interface AttemptRequest {
  user_id: string;
  question_id: string;
  student_answer: string;
}

export interface AttemptResponse {
  is_correct: boolean;
  correct_answer: string;
  answer_text: string;
  explanation_summary: string | null;
  error_type: string | null;
  wrong_units: string[];
  why_wrong: string | null;
  correct_fact: string | null;
  memory_hint: string | null;
  note_saved: boolean;
  note_id: string | null;
}

// 4. Error Notes
export interface ErrorNoteItem {
  id: string;
  question_id: string;
  question_stem: string;
  my_answer: string; // Backend uses my_answer
  correct_answer: string;
  error_type: string;
  why_wrong: string | null;
  correct_fact: string | null;
  memory_hint: string | null;
  review_front: string | null;
  review_back: string | null;
  era_tags: string[];
  created_at: string;
}

export interface ErrorNoteListResponse {
  total_count: number;
  notes: ErrorNoteItem[];
}

// 5. Review Queue
export interface ReviewQueueItem {
  queue_id: string; // Backend uses queue_id
  note_id: string;
  question_id: string;
  question_stem: string;
  error_type: string;
  memory_hint: string | null;
  review_count: number;
  due_at: string;
}

export interface ReviewQueueListResponse {
  due_count: number;
  items: ReviewQueueItem[];
}

export interface CompleteReviewRequest {
  user_id: string;
  is_correct: boolean;
}

export interface CompleteReviewResponse {
  queue_id: string;
  next_due_at: string | null;
  review_count: number;
  status: string;
}
