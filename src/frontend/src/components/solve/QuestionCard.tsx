"use client";

import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { QuestionDetail } from "@/lib/types/api";
import { resolveEraTheme } from "@/lib/theme/era";
import { FrameLabel, TextBlock } from "@/components/history-ui/primitives";

interface QuestionCardProps {
  question: QuestionDetail;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const theme = resolveEraTheme(question.era_tags);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[32px] border border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 md:p-7"
      style={{
        boxShadow: `0 18px 48px -32px ${theme.palette.glow}`,
      }}
    >
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-amber-300/35 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FrameLabel icon={<ScrollText className="h-3.5 w-3.5" />} text={`문항 ${question.q_num}`} subtle />
          {question.round ? <FrameLabel text={`제${question.round}회`} /> : null}
        </div>
        <div className="rounded-full border border-stone-700 bg-black/20 px-3 py-1 text-[11px] tracking-[0.16em] text-stone-300">
          {question.score}점
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {question.era_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-3 py-1 text-xs"
              style={{
                color: theme.palette.accent,
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.accentSoft,
              }}
            >
              {tag}
            </span>
          ))}
          {question.concept_tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-stone-700 bg-black/15 px-3 py-1 text-xs text-stone-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="rounded-[24px] border border-stone-800 bg-black/10 p-5 md:p-6">
          <h2
            className="text-xl font-semibold leading-[1.85] tracking-[-0.02em] text-stone-50 md:text-[1.65rem]"
            dangerouslySetInnerHTML={{ __html: question.stem }}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <TextBlock label="판단 축" value={theme.summary} />
          <TextBlock label="문항 출처" value={question.source || "출처 미기록"} />
        </div>
      </div>
    </motion.div>
  );
}
