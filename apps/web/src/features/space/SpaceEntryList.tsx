import type {
  EntryDateMode,
  EntrySummary,
  SpaceMemberSummary,
} from "@homewallet/shared";
import { Fragment, useMemo, useState } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatEntryDate, formatMoney } from "../../shared/lib/money";

type SpaceEntryListProps = {
  entries: EntrySummary[];
  members: SpaceMemberSummary[];
  myUserId: string | undefined;
  multiMember: boolean;
  transparent: boolean;
  currency: string;
  entryDateMode: EntryDateMode;
};

type ListFilter = "all" | "me" | `member:${string}`;

function isTransfer(entry: EntrySummary) {
  return entry.type === "transfer_in" || entry.type === "transfer_out";
}

export function SpaceEntryList({
  entries,
  members,
  myUserId,
  multiMember,
  transparent,
  currency,
  entryDateMode,
}: SpaceEntryListProps) {
  const { t, locale } = useLocale();
  const [listFilter, setListFilter] = useState<ListFilter>("all");

  const { regularEntries, transferEntries } = useMemo(() => {
    const regular: EntrySummary[] = [];
    const transfers: EntrySummary[] = [];
    for (const entry of entries) {
      if (isTransfer(entry)) {
        transfers.push(entry);
      } else {
        regular.push(entry);
      }
    }
    return { regularEntries: regular, transferEntries: transfers };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (listFilter === "all") {
      return regularEntries;
    }
    if (listFilter === "me") {
      return regularEntries.filter((entry) => entry.userId === myUserId);
    }
    const memberId = listFilter.slice("member:".length);
    return regularEntries.filter((entry) => entry.userId === memberId);
  }, [regularEntries, listFilter, myUserId]);

  const showMemberFilter = multiMember && transparent;
  const showMemberColumn = multiMember;
  const showVisibilityColumn = transparent;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">
          {t("space.entriesTitle")}
        </h2>
        {showMemberFilter ? (
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
            value={listFilter}
            onChange={(event) =>
              setListFilter(event.target.value as ListFilter)
            }
            aria-label={t("space.filterLabel")}
          >
            <option value="all">{t("space.filterAll")}</option>
            <option value="me">{t("space.filterMe")}</option>
            {members
              .filter((member) => member.userId !== myUserId)
              .map((member) => (
                <option key={member.userId} value={`member:${member.userId}`}>
                  {member.name}
                </option>
              ))}
          </select>
        ) : null}
      </div>

      {filteredEntries.length === 0 ? (
        <p className="text-sm text-muted">
          {transparent ? t("space.emptyVisible") : t("space.emptyShared")}
        </p>
      ) : (
        <SpaceEntriesTable
          entries={filteredEntries}
          currency={currency}
          locale={locale}
          entryDateMode={entryDateMode}
          showMemberColumn={showMemberColumn}
          showVisibilityColumn={showVisibilityColumn}
        />
      )}

      {transparent && transferEntries.length > 0 ? (
        <details className="rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-fg">
            {t("space.transfersSection")} ({transferEntries.length})
          </summary>
          <SpaceEntriesTable
            entries={transferEntries}
            currency={currency}
            locale={locale}
            entryDateMode={entryDateMode}
            showMemberColumn={showMemberColumn}
            showVisibilityColumn={false}
            embedded
          />
        </details>
      ) : null}
    </section>
  );
}

type SpaceEntriesTableProps = {
  entries: EntrySummary[];
  currency: string;
  locale: string;
  entryDateMode: EntryDateMode;
  showMemberColumn: boolean;
  showVisibilityColumn: boolean;
  embedded?: boolean;
};

function SpaceEntriesTable({
  entries,
  currency,
  locale,
  entryDateMode,
  showMemberColumn,
  showVisibilityColumn,
  embedded = false,
}: SpaceEntriesTableProps) {
  const { t } = useLocale();
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const showDateColumn = entryDateMode !== "month";

  const columnCount =
    3 +
    (showDateColumn ? 1 : 0) +
    (showMemberColumn ? 1 : 0) +
    (showVisibilityColumn ? 1 : 0);

  return (
    <div
      className={
        embedded
          ? "overflow-x-auto border-t border-border"
          : "overflow-x-auto rounded-lg border border-border bg-surface"
      }
    >
      <table
        className={`w-full border-collapse text-sm ${showDateColumn ? "min-w-[36rem]" : "min-w-[28rem]"}`}
      >
        <thead>
          <tr className="border-b border-border bg-bg text-left text-xs font-medium text-muted">
            {showDateColumn ? (
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">
                {t("space.colDate")}
              </th>
            ) : null}
            <th scope="col" className="px-3 py-2.5">
              {t("space.colCategory")}
            </th>
            <th scope="col" className="px-3 py-2.5">
              {t("space.colDescription")}
            </th>
            {showMemberColumn ? (
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">
                {t("space.colMember")}
              </th>
            ) : null}
            {showVisibilityColumn ? (
              <th scope="col" className="whitespace-nowrap px-3 py-2.5">
                {t("space.colVisibility")}
              </th>
            ) : null}
            <th
              scope="col"
              className="whitespace-nowrap px-3 py-2.5 text-right"
            >
              {t("space.colAmount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const hasCardLines = entry.cardLines.length > 0;
            const expanded = expandedEntryId === entry.id;
            const isTransferOut = entry.type === "transfer_out";
            const isTransferIn = entry.type === "transfer_in";

            let categoryLabel = entry.categoryName ?? "—";
            if (isTransferOut || isTransferIn) {
              categoryLabel = t("me.kindTransfer");
            } else if (entry.type === "income") {
              categoryLabel = t("me.income");
            } else if (entry.type === "saving") {
              categoryLabel = t("me.kindSaving");
            }

            const descriptionParts: string[] = [];
            if (entry.description) {
              descriptionParts.push(entry.description);
            }
            if (entry.counterpartyName) {
              descriptionParts.push(
                `${isTransferOut ? t("me.transferTo") : t("me.transferFrom")} ${entry.counterpartyName}`
              );
            }
            const descriptionText =
              descriptionParts.length > 0 ? descriptionParts.join(" · ") : "—";

            let amountClass = "text-expense-fg";
            if (entry.type === "income" || isTransferIn) {
              amountClass = "text-income-fg";
            } else if (entry.type === "saving") {
              amountClass = "text-accent";
            }

            return (
              <Fragment key={entry.id}>
                <tr
                  className={`border-b border-border/70 transition-colors last:border-b-0 hover:bg-bg ${
                    hasCardLines ? "cursor-pointer" : ""
                  }`}
                  onClick={
                    hasCardLines
                      ? () => setExpandedEntryId(expanded ? null : entry.id)
                      : undefined
                  }
                >
                  {showDateColumn ? (
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">
                      {formatEntryDate(entry.occurredOn, entryDateMode)}
                    </td>
                  ) : null}
                  <td className="max-w-[10rem] truncate px-3 py-2 font-medium text-fg">
                    {categoryLabel}
                    {hasCardLines ? (
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        ({entry.cardLines.length})
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2 text-muted">
                    {descriptionText}
                  </td>
                  {showMemberColumn ? (
                    <td className="whitespace-nowrap px-3 py-2 text-fg">
                      {entry.userName}
                    </td>
                  ) : null}
                  {showVisibilityColumn ? (
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {entry.visibility === "shared"
                        ? t("me.shared")
                        : t("me.personal")}
                    </td>
                  ) : null}
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium ${amountClass}`}
                  >
                    {formatMoney(entry.amount, currency, locale)}
                  </td>
                </tr>
                {expanded && hasCardLines ? (
                  <tr className="bg-bg">
                    <td colSpan={columnCount} className="px-3 py-2">
                      <ul className="flex flex-col gap-1 border-l-2 border-border pl-3 text-xs">
                        {entry.cardLines.map((line) => (
                          <li
                            key={line.id}
                            className="flex flex-wrap items-baseline justify-between gap-2"
                          >
                            <span className="text-muted">
                              {line.categoryName}
                              {line.description ? ` · ${line.description}` : ""}
                            </span>
                            <span className="tabular-nums text-expense-fg">
                              {formatMoney(line.amount, currency, locale)}
                            </span>
                          </li>
                        ))}
                        {entry.cardOthersAmount != null &&
                        entry.cardOthersAmount > 0 ? (
                          <li className="flex flex-wrap items-baseline justify-between gap-2 text-muted">
                            <span>{t("me.cardOthers")}</span>
                            <span className="tabular-nums">
                              {formatMoney(
                                entry.cardOthersAmount,
                                currency,
                                locale
                              )}
                            </span>
                          </li>
                        ) : null}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
