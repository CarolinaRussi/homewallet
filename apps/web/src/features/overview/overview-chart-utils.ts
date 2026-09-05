import type { OverviewMonthPoint } from "@homewallet/shared";
import { formatMoney } from "../../shared/lib/money";

export type TrendChartRow = OverviewMonthPoint & {
  label: string;
  balance: number;
};

/** Abbreviated month label; year suffix on first month and every January. */
export function formatChartMonthLabel(
  month: string,
  locale: string,
  showYear: boolean
): string {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  const monthName = date.toLocaleDateString(locale, { month: "short" });
  const capitalized =
    monthName.charAt(0).toUpperCase() + monthName.slice(1).replace(/\.$/, "");
  if (showYear && yearText) {
    const yearSuffix = yearText.slice(2);
    return `${capitalized} '${yearSuffix}`;
  }
  return capitalized;
}

export function buildTrendChartRows(
  points: OverviewMonthPoint[],
  locale: string
): TrendChartRow[] {
  return points.map((point, index) => {
    const showYear = index === 0 || point.month.endsWith("-01");
    return {
      ...point,
      label: formatChartMonthLabel(point.month, locale, showYear),
      balance: point.income - point.expense,
    };
  });
}

export function formatCompactMoney(
  amount: number,
  currency: string,
  locale: string
): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const compact = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
    return compact;
  }
  if (abs >= 10_000) {
    const compact = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(amount);
    return compact;
  }
  return formatMoney(amount, currency, locale);
}

export function formatDelta(
  delta: number,
  currency: string,
  locale: string
): string {
  const absolute = formatMoney(Math.abs(delta), currency, locale);
  if (delta > 0) {
    return `+${absolute}`;
  }
  if (delta < 0) {
    return `−${absolute}`;
  }
  return absolute;
}

export function formatMonthLong(month: string, locale: string): string {
  const [yearText, monthText] = month.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1, 1);
  const formatted = date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
