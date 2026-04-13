import {
  HISTORY_DESK_ERA_REFERENCES,
  type HistoryDeskEraReference,
} from "@/lib/theme/historyDeskReference";
import {
  resolveDominantEraTheme,
  resolveEraTheme,
  type KoreanHistoryEraTheme,
} from "@/lib/theme/era";

export interface StudentPageContext {
  theme: KoreanHistoryEraTheme;
  reference: HistoryDeskEraReference | null;
  accent: string;
}

export function getHistoryReferenceForTheme(
  theme: KoreanHistoryEraTheme,
): HistoryDeskEraReference | null {
  if (theme.key === "unknown") {
    return null;
  }

  return HISTORY_DESK_ERA_REFERENCES[theme.key];
}

export function getStudentPageContextFromInput(
  input: string | string[] | null | undefined,
): StudentPageContext {
  const theme = resolveEraTheme(input);
  const reference = getHistoryReferenceForTheme(theme);

  return {
    theme,
    reference,
    accent: reference?.accent ?? theme.palette.accent,
  };
}

export function getStudentPageContextFromInputs(
  inputs: Array<string | string[] | null | undefined>,
): StudentPageContext {
  const theme = resolveDominantEraTheme(inputs);
  const reference = getHistoryReferenceForTheme(theme);

  return {
    theme,
    reference,
    accent: reference?.accent ?? theme.palette.accent,
  };
}
