"use client";

import { ReviewQueueItem } from "@/lib/types/api";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { resolveEraTheme } from "@/lib/theme/era";
import {
  AngbuilguIcon,
  BookmarkSlipIcon,
  TileNodeIcon,
} from "@/components/icons/HistoricalIcons";

interface ReviewQueueCardProps {
  item: ReviewQueueItem;
}

export function ReviewQueueCard({ item }: ReviewQueueCardProps) {
  const router = useRouter();
  const isOverdue = new Date(item.due_at) < new Date();
  const dueStr = new Date(item.due_at).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
  const theme = resolveEraTheme([item.question_stem, item.memory_hint ?? ""]);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn(
        "panel cursor-pointer overflow-hidden px-4 py-4 transition-colors duration-200",
        isOverdue ? "border-[#e0b2b2] bg-[#fffafa]" : "border-border/60",
      )}
      onClick={() => router.push(`/solve?queue=${item.queue_id}`)}
    >
      <div className="roof-tile-band -mx-4 -mt-4 mb-4" style={{ color: theme.palette.accent }} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TileNodeIcon
              size={12}
              className="shrink-0"
              style={{ color: theme.palette.accent }}
            />
            <span className="text-[11px] font-black tracking-[0.08em] text-muted font-gothic">
              {theme.label}
            </span>
            <span
              className="ui-chip px-2.5 py-1 text-[10px]"
              style={{
                backgroundColor: isOverdue ? "#fff0f0" : "#f7f4ee",
                color: isOverdue ? "#8c1f1f" : theme.palette.text,
              }}
            >
              {item.error_type || "개념 오류"}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-[16px] font-bold leading-snug text-foreground font-myeongjo">
            {item.question_stem || "문항 정보 없음"}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-black tracking-[0.08em] text-muted font-gothic">
            복습 차수
          </div>
          <div className="mt-1 text-lg font-black text-foreground font-myeongjo">
            {item.review_count}회
          </div>
        </div>
      </div>

      <div className="panel-soft mt-4 px-4 py-3">
        <div className="page-eyebrow flex items-center gap-2 text-muted">
          <BookmarkSlipIcon size={12} style={{ color: theme.palette.accent }} />
          기억 포인트
        </div>
        <p className="mt-2 text-sm font-bold leading-relaxed text-foreground font-gothic">
          {item.memory_hint || "핵심 기억 포인트가 아직 정리되지 않았습니다."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-muted font-gothic">
          <span className="flex items-center gap-1.5">
            <AngbuilguIcon size={12} style={{ color: theme.palette.accent }} />
            복습일 {dueStr}
          </span>
          {isOverdue ? (
            <span className="flex items-center gap-1.5 text-[#8c1f1f]">
              <AlertTriangle size={12} />
              복습 지연
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <BookmarkSlipIcon size={12} style={{ color: theme.palette.accent }} />
              복습 예정
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.08em] text-foreground font-gothic">
          다시 풀기
          <ArrowRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}
