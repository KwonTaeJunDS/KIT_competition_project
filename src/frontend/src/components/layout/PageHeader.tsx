import type { CSSProperties, ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type HeaderIconComponent = ComponentType<{
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}>;

interface PageHeaderProps {
  icon: HeaderIconComponent;
  eyebrow: string;
  title: string;
  description: ReactNode;
  chips?: string[];
  actions?: ReactNode;
  accentColor?: string;
  borderColor?: string;
  surfaceColor?: string;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  chips = [],
  actions,
  accentColor = "var(--primary)",
  borderColor = "var(--line-strong)",
  surfaceColor = "var(--surface-soft)",
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("reference-header", className)}>
      <div className="reference-roof" />
      <div className="page-header-row">
        <div className="reference-header-row">
          <div
            className="reference-icon"
            style={{
              color: accentColor,
              borderColor,
              backgroundColor: surfaceColor,
            }}
          >
            <Icon size={20} />
          </div>

          <div className="min-w-0">
            <span className="reference-subtitle" style={{ color: accentColor }}>
              {eyebrow}
            </span>
            <h1 className="reference-title font-myeongjo">{title}</h1>
          </div>
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="reference-description font-gothic" style={{ color: "var(--muted)" }}>
        {description}
      </div>

      {chips.length > 0 ? (
        <div className="reference-tag-group">
          {chips.map((chip, index) => (
            <span
              key={chip}
              className={cn(
                "reference-tag",
                index === 0 ? "reference-tag-primary" : "reference-tag-outline",
              )}
              style={{
                color: index === 0 ? accentColor : undefined,
                borderColor: index === 0 ? accentColor : borderColor,
                backgroundColor: index === 0 ? "#e8ede9" : "transparent",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}
