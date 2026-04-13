"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { AttemptResponse } from "@/lib/types/api";

interface ResultSheetProps {
  result: AttemptResponse;
  isOpen: boolean;
  onNext?: () => void;
}

export function ResultSheet({ result, isOpen, onNext }: ResultSheetProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.28 }}
          className="pointer-events-none fixed inset-x-0 z-50"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.75rem)" }}
        >
          <div className="pointer-events-auto mx-auto max-w-3xl px-4">
            <div className="max-h-[78vh] overflow-y-auto rounded-[32px] border border-stone-800/90 bg-[#0f0f11]/96 px-6 pb-8 pt-6 shadow-[0_25px_70px_rgba(0,0,0,0.5)] backdrop-blur">
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em]"
                      style={{
                        color: result.is_correct ? "#fef3c7" : "#fecaca",
                        borderColor: result.is_correct ? "rgba(251,191,36,0.2)" : "rgba(248,113,113,0.2)",
                        backgroundColor: result.is_correct ? "rgba(217,119,6,0.12)" : "rgba(127,29,29,0.18)",
                      }}
                    >
                      {result.is_correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {result.is_correct ? "정답" : "오답"}
                    </div>
                    <span className="text-sm font-medium text-stone-300">정답 {result.correct_answer}</span>
                  </div>

                  {result.note_saved ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                      오답 노트 저장됨
                    </span>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-stone-800 bg-black/20 p-5">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">해설</div>
                  <p className="mt-3 text-[17px] font-medium leading-[1.8] text-stone-100">
                    {result.explanation_summary || "정답 해설을 불러오는 중입니다."}
                  </p>
                </div>

                {!result.is_correct ? (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-[24px] border border-stone-800 bg-black/15 p-5">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">오답 분석</div>
                      <p className="mt-3 text-sm leading-7 text-stone-200">
                        {result.why_wrong || "오답 사유를 정리 중입니다."}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-amber-300/15 bg-amber-300/5 p-5">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-stone-500">기억 포인트</div>
                      <p className="mt-3 text-sm leading-7 text-amber-50">
                        {result.memory_hint || "이 문제의 핵심 기억 포인트입니다."}
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3 pt-2">
                  {result.note_saved ? (
                    <Link
                      href="/notes"
                      className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-black/20 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:border-stone-600 hover:bg-black/30"
                    >
                      오답노트 보기
                    </Link>
                  ) : null}
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-2 rounded-full border border-stone-700 bg-black/20 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:border-stone-600 hover:bg-black/30"
                  >
                    복습으로 이어 보기
                  </Link>
                  <button
                    type="button"
                    onClick={onNext}
                    className="group inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/12 px-5 py-2.5 text-sm font-medium text-amber-50 transition hover:bg-amber-300/18"
                  >
                    다음 문제로 넘어가기
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
