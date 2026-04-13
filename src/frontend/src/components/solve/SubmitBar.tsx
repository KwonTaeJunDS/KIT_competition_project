"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/components/history-ui/primitives";

interface SubmitBarProps {
  onNext?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  showNext?: boolean;
}

export function SubmitBar({
  onNext,
  onSubmit,
  isSubmitting,
  canSubmit,
  showNext,
}: SubmitBarProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 mx-auto w-full max-w-3xl px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.75rem)" }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto rounded-[28px] border border-stone-800/90 bg-[#0f0f11]/92 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur"
      >
        <AnimatePresence mode="wait">
          {showNext ? (
            <motion.button
              key="next-btn"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              type="button"
              onClick={onNext}
              className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-5 text-sm font-medium text-amber-50 transition hover:bg-amber-300/18"
            >
              다음 문제로 넘어가기
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </motion.button>
          ) : (
            <motion.button
              key="submit-btn"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                "inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium transition-all duration-300",
                canSubmit && !isSubmitting
                  ? "border-amber-300/30 bg-amber-300/12 text-amber-50 hover:bg-amber-300/18"
                  : "border-stone-800 bg-stone-900 text-stone-500 grayscale",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  분석 중...
                </>
              ) : (
                <>
                  정답 제출하고 해설 보기
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
