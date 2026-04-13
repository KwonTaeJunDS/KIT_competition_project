import { QuestionDetail } from "../types/api";

/**
 * Maps raw Question Detail API response to UI-friendly model.
 */
export function mapQuestionDetail(apiData: QuestionDetail) {
  return {
    ...apiData,
    // Add UI-specific derived fields here if needed
    hasImage: apiData.stem.includes("<img") || apiData.stem.includes("[사진:"),
  };
}
