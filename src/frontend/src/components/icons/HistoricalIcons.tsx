import type { CSSProperties, ReactNode } from "react";

interface HistoricalIconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

function BaseIcon({
  size = 24,
  className,
  style,
  strokeWidth = 1.8,
  children,
}: HistoricalIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CheomseongdaeIcon(props: HistoricalIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9.5 4.5h5" />
      <path d="M8.75 7h6.5" />
      <path d="M8 9.5h8" />
      <path d="M9.75 10.5h4.5v3.5h-4.5z" />
      <path d="M7.5 14.5h9" />
      <path d="M6.75 17h10.5" />
      <path d="M6 19.5h12" />
    </BaseIcon>
  );
}

export function ExamPaperIcon(props: HistoricalIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h8.5A1.5 1.5 0 0 1 18 6v12.5H7V5.5A1 1 0 0 1 8 4.5Z" />
      <path d="M10 4.5v14" />
      <path d="M12 8h4" />
      <path d="M12 11h4" />
      <path d="M12 14h4" />
      <path d="M8.25 7h1" />
      <path d="M8.25 16h1" />
    </BaseIcon>
  );
}

export function ArchiveBoxIcon(props: HistoricalIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 7.5h12a1 1 0 0 1 1 1V18H5V8.5a1 1 0 0 1 1-1Z" />
      <path d="M8 5.5h8" />
      <path d="M8 10.5h8" />
      <path d="M12 7.5v10.5" />
      <path d="M9.5 13.5h2" />
      <path d="M12.5 13.5h2" />
    </BaseIcon>
  );
}

export function AngbuilguIcon(props: HistoricalIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 11.25a6 6 0 0 1 12 0" />
      <path d="M7 11.25h10" />
      <path d="M12 7.75v3.5" />
      <path d="M9 18.5h6" />
      <path d="M9.75 15.75 8.5 18.5" />
      <path d="M14.25 15.75 15.5 18.5" />
    </BaseIcon>
  );
}

export function BookmarkSlipIcon(props: HistoricalIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 4.5h8a1 1 0 0 1 1 1V19l-5-2.5L7 19V5.5a1 1 0 0 1 1-1Z" />
      <path d="M10 8h4" />
      <path d="M10 11h4" />
    </BaseIcon>
  );
}

export function TileNodeIcon(props: HistoricalIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.25" />
    </BaseIcon>
  );
}

export const PalaceIcon = CheomseongdaeIcon;
export const ScrollIcon = ExamPaperIcon;
export const ArchiveIcon = ArchiveBoxIcon;
export const SundialIcon = AngbuilguIcon;
export const SealIcon = BookmarkSlipIcon;
export const BrushIcon = BookmarkSlipIcon;
