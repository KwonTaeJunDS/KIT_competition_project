"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChoiceItem } from "@/lib/types/api";
import { cn } from "@/components/history-ui/primitives";

interface ChoiceListProps {
  choices: ChoiceItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

export function ChoiceList({ choices, selectedKey, onSelect, disabled }: ChoiceListProps) {
  return (
    <ul className="flex flex-col gap-4">
      {choices.map((choice, index) => {
        const isSelected = selectedKey === choice.key;

        return (
          <motion.li
            key={choice.key}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + index * 0.05 }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(choice.key)}
              className={cn(
                "group relative flex w-full items-start gap-5 overflow-hidden rounded-[28px] border p-5 text-left transition-all duration-200",
                isSelected
                  ? "border-amber-300/35 bg-[linear-gradient(180deg,rgba(217,119,6,0.12),rgba(255,255,255,0.02))] text-stone-50 shadow-[0_18px_50px_rgba(120,53,15,0.12)]"
                  : "border-stone-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] text-stone-200 hover:border-stone-700",
                disabled && !isSelected && "pointer-events-none opacity-40 grayscale",
              )}
            >
              <span
                className={cn(
                  "relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors duration-300",
                  isSelected
                    ? "border-amber-200 bg-amber-300/15 text-amber-50"
                    : "border-stone-700 bg-black/15 text-stone-400 group-hover:border-stone-500 group-hover:text-stone-200",
                )}
              >
                {choice.key}
              </span>

              <span
                className={cn(
                  "relative z-10 flex-1 pt-0.5 text-[16px] font-medium leading-relaxed tracking-[-0.01em] transition-colors duration-300",
                  isSelected ? "text-stone-50" : "text-stone-200",
                )}
              >
                {choice.text}
              </span>

              <AnimatePresence>
                {isSelected ? (
                  <motion.div
                    layoutId="choice-active-bg"
                    className="absolute inset-0 -z-0 bg-gradient-to-br from-amber-300/8 via-stone-200/5 to-transparent"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  />
                ) : null}
              </AnimatePresence>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}
