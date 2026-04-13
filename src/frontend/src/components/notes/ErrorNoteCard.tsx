"use client";

import { useState } from "react";
import { ErrorNoteItem } from "@/lib/types/api";
import { ChevronDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveEraTheme } from "@/lib/theme/era";
import {
  ArchiveBoxIcon,
  BookmarkSlipIcon,
  ExamPaperIcon,
} from "@/components/icons/HistoricalIcons";

interface ErrorNoteCardProps {
  note: ErrorNoteItem;
}

export function ErrorNoteCard({ note }: ErrorNoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = resolveEraTheme(note.era_tags);

  return (
    <motion.div
      layout
      className="panel mb-4 overflow-hidden border-l-4 px-5 py-5 transition-all duration-200"
      style={{
        borderLeftColor: theme.palette.accent,
        backgroundColor: "#fffdf9",
        boxShadow: isExpanded ? `0 18px 36px -26px ${theme.palette.glow}` : undefined,
      }}
    >
      <div className="roof-tile-band -mx-5 -mt-5 mb-4" style={{ color: theme.palette.accent }} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {note.era_tags.map((tag) => (
            <span
              key={tag}
              className="ui-chip"
              style={{
                color: theme.palette.accent,
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.accentSoft,
              }}
            >
              {tag}
            </span>
          ))}
          <span className="ui-chip">{note.error_type || "개념 오류"}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="toolbar-icon-button h-9 w-9"
          aria-expanded={isExpanded}
        >
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
            <ChevronDown size={18} />
          </motion.div>
        </button>
      </div>

      <h3 className="mb-5 text-[17px] font-bold leading-[1.6] tracking-tight text-foreground font-myeongjo">
        {note.question_stem}
      </h3>

      <div className="mb-2 flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="page-eyebrow text-muted">나의 선택</span>
          <div
            className="ui-chip justify-start px-3 py-1.5 text-xs"
            style={{
              color: "var(--error)",
              borderColor: "rgba(158, 42, 47, 0.2)",
              backgroundColor: "rgba(158, 42, 47, 0.06)",
            }}
          >
            <AlertCircle size={12} />
            {note.my_answer || "N/A"}번
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="page-eyebrow text-muted">정답</span>
          <div
            className="ui-chip justify-start px-3 py-1.5 text-xs"
            style={{
              color: "var(--success)",
              borderColor: "rgba(29, 75, 63, 0.2)",
              backgroundColor: "rgba(29, 75, 63, 0.06)",
            }}
          >
            <CheckCircle2 size={12} />
            {note.correct_answer || "N/A"}번
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 flex flex-col gap-4 border-t border-border/20 pt-6">
              <section className="panel-soft px-4 py-4">
                <header
                  className="page-eyebrow mb-3 flex items-center gap-2"
                  style={{ color: theme.palette.accent }}
                >
                  <ExamPaperIcon size={12} style={{ color: theme.palette.accent }} />
                  오답 분석
                </header>
                <p className="text-[14px] font-bold leading-relaxed text-foreground/80 font-myeongjo">
                  {note.why_wrong || "오답 분석이 아직 생성되지 않았습니다."}
                </p>
              </section>

              <section
                className="panel-soft px-4 py-4"
                style={{
                  backgroundColor: theme.palette.surface,
                  borderColor: theme.palette.border,
                }}
              >
                <header
                  className="page-eyebrow mb-3 flex items-center gap-2"
                  style={{ color: theme.palette.accent }}
                >
                  <ArchiveBoxIcon size={12} style={{ color: theme.palette.accent }} />
                  바로잡은 내용
                </header>
                <p className="text-[16px] font-bold leading-relaxed text-foreground font-myeongjo">
                  {note.correct_fact || "핵심 개념을 다시 확인 중입니다."}
                </p>
              </section>

              <section
                className="panel-soft border-l-4 px-4 py-4"
                style={{
                  backgroundColor: theme.palette.accentSoft,
                  borderColor: theme.palette.border,
                  borderLeftColor: theme.palette.accent,
                }}
              >
                <header
                  className="page-eyebrow mb-2 flex items-center gap-2"
                  style={{ color: theme.palette.accent }}
                >
                  <BookmarkSlipIcon size={12} style={{ color: theme.palette.accent }} />
                  기억 팁
                </header>
                <p className="text-[14px] font-bold leading-relaxed text-foreground font-myeongjo">
                  {note.memory_hint || "이 개념을 암기할 핵심 포인트를 정리 중입니다."}
                </p>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
