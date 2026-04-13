"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("bg-slate-200/50 rounded-xl relative overflow-hidden", className)}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", repeatType: "reverse" }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </motion.div>
  );
}

export function QuestionSkeleton() {
  return (
    <div className="flex flex-col gap-8 pb-32 w-full max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-20 h-6 rounded-full" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </header>

      {/* Main Question Card Skeleton */}
      <Skeleton className="h-48 w-full rounded-2xl shadow-sm border border-border" />

      {/* Choices Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
           <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
