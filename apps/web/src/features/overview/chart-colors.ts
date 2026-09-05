/** Distinct chart slice colors — mapped to CSS vars in index.css */
export const CHART_COLORS = [
  "var(--hw-chart-1)",
  "var(--hw-chart-2)",
  "var(--hw-chart-3)",
  "var(--hw-chart-4)",
  "var(--hw-chart-5)",
  "var(--hw-chart-6)",
] as const;

export const CHART_OTHER_COLOR = "var(--hw-chart-other)";

/** Stable color per category id (not list index). */
export function getCategoryColor(
  categoryId: string | null,
  isOther: boolean
): string {
  if (isOther) {
    return CHART_OTHER_COLOR;
  }
  if (!categoryId) {
    return CHART_COLORS[0];
  }
  let hash = 0;
  for (let index = 0; index < categoryId.length; index++) {
    hash = (hash * 31 + categoryId.charCodeAt(index)) >>> 0;
  }
  return CHART_COLORS[hash % CHART_COLORS.length] ?? CHART_COLORS[0];
}
