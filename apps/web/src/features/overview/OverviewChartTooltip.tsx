import type { ReactNode } from "react";

type OverviewChartTooltipShellProps = {
  children: ReactNode;
  className?: string;
};

export function OverviewChartTooltipShell({
  children,
  className = "",
}: OverviewChartTooltipShellProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface px-3 py-2.5 text-sm shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

type OverviewChartTooltipRowProps = {
  label: string;
  value: string;
  valueClassName?: string;
  markerColor?: string;
  markerShape?: "square" | "line";
};

export function OverviewChartTooltipRow({
  label,
  value,
  valueClassName = "text-fg",
  markerColor,
  markerShape = "square",
}: OverviewChartTooltipRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex min-w-0 items-center gap-2 text-muted">
        {markerColor ? (
          markerShape === "line" ? (
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: markerColor }}
              aria-hidden
            />
          ) : (
            <span
              className="size-2 shrink-0 rounded-sm"
              style={{ background: markerColor }}
              aria-hidden
            />
          )
        ) : null}
        <span>{label}</span>
      </span>
      <span className={`shrink-0 tabular-nums font-medium ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

export function OverviewChartTooltipDivider() {
  return <div className="my-2 border-t border-border" />;
}
