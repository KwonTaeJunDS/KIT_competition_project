"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { ArchiveBoxIcon, BookmarkSlipIcon } from "@/components/icons/HistoricalIcons";

interface EmptyStateProps {
  icon?: "check" | "inbox";
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({ icon = "check", title, description, className }: EmptyStateProps) {
  const Icon = icon === "check" ? BookmarkSlipIcon : ArchiveBoxIcon;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={cn("flex flex-col items-center justify-center text-center py-24 px-6", className)}
    >
      <div className="icon-plaque mb-6 h-16 w-16 rounded-[1rem] text-muted">
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight font-myeongjo">{title}</h3>
      <p className="max-w-[260px] text-sm font-bold leading-relaxed text-muted font-gothic">
        {description}
      </p>
    </motion.div>
  );
}
