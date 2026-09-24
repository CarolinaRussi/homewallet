import type {
  EntryDateMode,
  EntrySummary,
  SpaceMemberSummary,
} from "@homewallet/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatEntryDate, formatMoney } from "../../shared/lib/money";
import { getCategoryColor } from "../overview/chart-colors";
import {
  buildSpaceMemberCategoryMatrix,
  matrixCellKey,
  UNCATEGORIZED_ID,
  type SpaceMatrixLine,
} from "./space-member-category-matrix";

type SpaceMemberCategoryTableProps = {
  entries: EntrySummary[];
  members: SpaceMemberSummary[];
  myUserId: string | undefined;
  currency: string;
  entryDateMode: EntryDateMode;
};

type Selection = {
  userId?: string;
  categoryId?: string;
};

export function SpaceMemberCategoryTable({
  entries,
  members,
  myUserId,
  currency,
  entryDateMode,
}: SpaceMemberCategoryTableProps) {
  const { t, locale } = useLocale();
  const [selection, setSelection] = useState<Selection | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const orderedMembers = useMemo(() => {
    const mine = members.filter((member) => member.userId === myUserId);
    const peers = members.filter((member) => member.userId !== myUserId);
    return [...mine, ...peers];
  }, [members, myUserId]);

  const matrix = useMemo(
    () => buildSpaceMemberCategoryMatrix(entries),
    [entries]
  );

  const transferEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.type === "transfer_in" || entry.type === "transfer_out"
      ),
    [entries]
  );

  const detailLines = useMemo(() => {
    if (!selection) {
      return [];
    }
    const collected: SpaceMatrixLine[] = [];
    for (const [key, lines] of matrix.lines) {
      const [userId, categoryId] = key.split("\t");
      if (selection.userId && userId !== selection.userId) {
        continue;
      }
      if (selection.categoryId && categoryId !== selection.categoryId) {
        continue;
      }
      collected.push(...lines);
    }
    return collected.sort((left, right) =>
      right.occurredOn.localeCompare(left.occurredOn)
    );
  }, [matrix.lines, selection]);

  function categoryLabel(categoryId: string, fallbackName: string) {
    if (categoryId === UNCATEGORIZED_ID || !fallbackName) {
      return t("space.matrixUncategorized");
    }
    return fallbackName;
  }

  useEffect(() => {
    const panel = detailRef.current;
    if (!panel || !selection) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      const margin = 24;
      const viewHeight = window.innerHeight;
      if (rect.height > viewHeight - margin * 2) {
        window.scrollBy({ top: rect.top - margin, behavior: "smooth" });
        return;
      }
      if (rect.bottom > viewHeight - margin) {
        window.scrollBy({
          top: rect.bottom - viewHeight + margin,
          behavior: "smooth",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selection, detailLines.length]);

  function toggleSelection(next: Selection) {
    if (
      selection?.userId === next.userId &&
      selection?.categoryId === next.categoryId
    ) {
      setSelection(null);
      return;
    }
    setSelection(next);
  }

  if (matrix.categories.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <h2 className="text-lg font-semibold text-fg">
          {t("space.matrixTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("space.matrixEmpty")}</p>
      </section>
    );
  }

  const detailTitle = (() => {
    if (!selection) {
      return "";
    }
    const memberName = selection.userId
      ? (orderedMembers.find((member) => member.userId === selection.userId)
          ?.name ?? "")
      : t("space.matrixEveryone");
    const category = selection.categoryId
      ? categoryLabel(
          selection.categoryId,
          matrix.categories.find(
            (category) => category.id === selection.categoryId
          )?.name ?? ""
        )
      : t("space.matrixAllCategories");
    if (selection.userId && selection.categoryId) {
      return `${memberName} · ${category}`;
    }
    return selection.userId ? memberName : category;
  })();

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <h2 className="text-lg font-semibold text-fg">
          {t("space.matrixTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("space.matrixHint")}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-surface px-3 py-2.5"
                >
                  {t("space.colMember")}
                </th>
                {matrix.categories.map((category) => (
                  <th
                    key={category.id}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2.5 text-right"
                  >
                    <button
                      type="button"
                      className="inline-flex max-w-36 items-center justify-end gap-1.5 text-right hover:text-fg"
                      onClick={() =>
                        toggleSelection({ categoryId: category.id })
                      }
                    >
                      <span
                        className="size-2 shrink-0 rounded-sm"
                        style={{
                          background: getCategoryColor(
                            category.id === UNCATEGORIZED_ID
                              ? null
                              : category.id,
                            category.id === UNCATEGORIZED_ID
                          ),
                        }}
                        aria-hidden
                      />
                      <span className="truncate">
                        {categoryLabel(category.id, category.name)}
                      </span>
                    </button>
                  </th>
                ))}
                <th
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 text-right"
                >
                  {t("space.matrixTotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedMembers.map((member) => (
                <tr key={member.userId} className="border-t border-border/70">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-medium text-fg"
                  >
                    {member.name}
                  </th>
                  {matrix.categories.map((category) => {
                    const amount =
                      matrix.cells.get(
                        matrixCellKey(member.userId, category.id)
                      ) ?? 0;
                    const selected =
                      selection?.userId === member.userId &&
                      selection.categoryId === category.id;
                    const heat =
                      amount > 0 && matrix.maxCell > 0
                        ? Math.max(
                            8,
                            Math.round((amount / matrix.maxCell) * 26)
                          )
                        : 0;

                    return (
                      <td key={category.id} className="px-1.5 py-1 text-right">
                        {amount > 0 ? (
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              toggleSelection({
                                userId: member.userId,
                                categoryId: category.id,
                              })
                            }
                            className={`w-full rounded-md px-2 py-1.5 text-right tabular-nums transition-colors ${
                              selected
                                ? "ring-2 ring-accent ring-offset-2 ring-offset-surface"
                                : "hover:bg-bg"
                            }`}
                            style={{
                              background: `color-mix(in srgb, var(--hw-expense-fg) ${heat}%, transparent)`,
                            }}
                          >
                            {formatMoney(amount, currency, locale)}
                          </button>
                        ) : (
                          <span className="block px-2 py-1.5 text-muted">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-fg">
                    {formatMoney(
                      matrix.memberTotals.get(member.userId) ?? 0,
                      currency,
                      locale
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {t("space.matrixTotal")}
                </th>
                {matrix.categories.map((category) => (
                  <td
                    key={category.id}
                    className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-sm font-medium text-fg"
                  >
                    {formatMoney(
                      matrix.categoryTotals.get(category.id) ?? 0,
                      currency,
                      locale
                    )}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-semibold text-fg">
                  {formatMoney(matrix.grandTotal, currency, locale)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {selection && detailLines.length > 0 ? (
        <div
          ref={detailRef}
          className="scroll-mt-6 rounded-lg border border-border bg-surface px-4 py-4 md:px-5"
        >
          <p className="text-sm font-medium text-fg">{detailTitle}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {detailLines.map((line, index) => {
              const memberName =
                orderedMembers.find((member) => member.userId === line.userId)
                  ?.name ?? "";
              const description =
                line.kind === "others"
                  ? [t("me.cardOthers"), line.description]
                      .filter(Boolean)
                      .join(" · ")
                  : line.description;

              return (
                <li
                  key={`${line.entryId}-${line.categoryId}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 break-words text-muted">
                    {formatEntryDate(line.occurredOn, entryDateMode)}
                    {selection.userId ? "" : ` · ${memberName}`}
                    {description ? ` · ${description}` : ""}
                  </span>
                  <span className="tabular-nums font-medium text-expense-fg">
                    {formatMoney(line.amount, currency, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {transferEntries.length > 0 ? (
        <details className="rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-fg">
            {t("space.transfersSection")} ({transferEntries.length})
          </summary>
          <ul className="flex flex-col gap-2 border-t border-border px-4 py-3">
            {transferEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="text-muted">
                  {entry.userName}
                  {entry.counterpartyName ? ` → ${entry.counterpartyName}` : ""}
                  {entry.description ? ` · ${entry.description}` : ""}
                </span>
                <span className="tabular-nums text-fg">
                  {formatMoney(entry.amount, currency, locale)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
