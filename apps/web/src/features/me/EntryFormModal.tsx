import { useState } from "react";
import type { FormEvent } from "react";
import type {
  CategorySummary,
  EntryDateMode,
  EntrySummary,
  ReservePotSummary,
} from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { occurredOnToMonth, todayIsoDate } from "../../shared/lib/money";
import { Spinner } from "../../shared/ui/Spinner";

export type EntryKind = "once" | "recurring" | "installment" | "saving";

type EntryFormModalProps = {
  open: boolean;
  editing: EntrySummary | null;
  month: string;
  entryDateMode: EntryDateMode;
  categories: CategorySummary[];
  pots: ReservePotSummary[];
  pending: boolean;
  creatingCategory: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, entryKind: EntryKind) => void;
  onCreateCategory: (name: string) => Promise<CategorySummary>;
};

export function EntryFormModal({
  open,
  editing,
  month,
  entryDateMode,
  categories,
  pots,
  pending,
  creatingCategory,
  onClose,
  onSubmit,
  onCreateCategory,
}: EntryFormModalProps) {
  const { t } = useLocale();
  const [entryKind, setEntryKind] = useState<EntryKind>(
    editing?.type === "saving" ? "saving" : "once"
  );
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  if (!open) {
    return null;
  }

  const formKey = editing?.id ?? "new";
  const isSaving =
    editing?.type === "saving" || (!editing && entryKind === "saving");
  const ledgerCategories = categories.filter(
    (category) => category.name !== SAVING_CATEGORY_NAME
  );
  const formBusy = pending || creatingCategory;

  async function submitNewCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }
    setCategoryError("");
    try {
      const category = await onCreateCategory(name);
      setCategoryId(category.id);
      setNewCategoryName("");
      setAddingCategory(false);
    } catch (error) {
      setCategoryError(
        error instanceof Error ? error.message : t("me.categoryCreateFailed")
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !formBusy) {
          onClose();
        }
      }}
    >
      <form
        key={formKey}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-lg"
        onSubmit={(event) =>
          onSubmit(
            event,
            editing
              ? editing.type === "saving"
                ? "saving"
                : "once"
              : entryKind
          )
        }
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="entry-form-title" className="text-lg font-semibold text-fg">
            {editing ? t("me.editEntry") : t("me.addEntry")}
          </h2>
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 text-xl leading-none text-muted hover:text-fg disabled:opacity-70"
            disabled={formBusy}
            onClick={onClose}
            aria-label={t("me.close")}
          >
            ×
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {!editing ? (
            <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
              {t("me.entryKind")}
              <select
                value={entryKind}
                onChange={(event) =>
                  setEntryKind(event.target.value as EntryKind)
                }
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              >
                <option value="once">{t("me.kindOnce")}</option>
                <option value="saving">{t("me.kindSaving")}</option>
                <option value="recurring">{t("me.kindRecurring")}</option>
                <option value="installment">{t("me.kindInstallment")}</option>
              </select>
            </label>
          ) : null}
          {isSaving ? (
            <p className="text-xs text-muted sm:col-span-2">
              {t("me.savingHint")}
            </p>
          ) : null}
          {entryKind === "installment" && !editing ? (
            <p className="text-xs text-muted sm:col-span-2">
              {t("me.installmentAmountHint")}
            </p>
          ) : null}
          {entryKind === "recurring" && !editing ? (
            <p className="text-xs text-muted sm:col-span-2">
              {t("me.recurringStartHint")}
            </p>
          ) : null}

          {isSaving ? (
            <input type="hidden" name="type" value="saving" />
          ) : (
            <label className="flex flex-col gap-1 text-sm text-muted">
              {t("me.type")}
              <select
                name="type"
                required
                defaultValue={editing?.type ?? "expense"}
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              >
                <option value="income">{t("me.income")}</option>
                <option value="expense">{t("me.expense")}</option>
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-muted">
            {entryKind === "installment" && !editing
              ? t("me.installmentAmountLabel")
              : t("me.amount")}
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={editing?.amount}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg tabular-nums"
            />
          </label>

          {isSaving ? (
            <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
              {t("reserve.pot")}
              <select
                name="reservePotId"
                required
                defaultValue={editing?.reservePotId ?? pots[0]?.id ?? ""}
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              >
                {pots.map((pot) => (
                  <option key={pot.id} value={pot.id}>
                    {pot.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-1 text-sm text-muted">
              <label className="flex flex-col gap-1">
                {t("me.category")}
                <select
                  name="categoryId"
                  required
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                >
                  <option value="" disabled>
                    {t("me.categoryPlaceholder")}
                  </option>
                  {ledgerCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {addingCategory ? (
                <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-bg/50 p-2">
                  <input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder={t("me.newCategory")}
                    className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                    autoFocus
                    disabled={creatingCategory}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void submitNewCategory();
                      }
                    }}
                  />
                  {categoryError ? (
                    <p className="text-xs text-expense-fg">{categoryError}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-fg disabled:opacity-70"
                      disabled={creatingCategory || !newCategoryName.trim()}
                      onClick={() => void submitNewCategory()}
                    >
                      {creatingCategory ? <Spinner /> : null}
                      {creatingCategory
                        ? t("me.addingCategory")
                        : t("me.addCategory")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-2.5 py-1.5 text-muted underline disabled:opacity-70"
                      disabled={creatingCategory}
                      onClick={() => {
                        setAddingCategory(false);
                        setNewCategoryName("");
                        setCategoryError("");
                      }}
                    >
                      {t("me.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="self-start text-xs text-accent underline disabled:opacity-70"
                  disabled={formBusy}
                  onClick={() => setAddingCategory(true)}
                >
                  {t("me.newCategory")}
                </button>
              )}
            </div>
          )}

          {editing || entryKind === "once" || entryKind === "saving" ? (
            <label className="flex flex-col gap-1 text-sm text-muted">
              {entryDateMode === "month" ? t("me.month") : t("me.date")}
              {entryDateMode === "month" ? (
                <input
                  name="occurredOn"
                  type="month"
                  required
                  defaultValue={
                    editing ? occurredOnToMonth(editing.occurredOn) : month
                  }
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              ) : (
                <input
                  name="occurredOn"
                  type="date"
                  required
                  defaultValue={editing?.occurredOn ?? todayIsoDate()}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              )}
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-muted">
              {entryKind === "installment"
                ? t("me.installmentStartMonth")
                : t("me.startMonth")}
              <input
                name="startMonth"
                type="month"
                required
                defaultValue={month}
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              />
            </label>
          )}

          {entryKind === "recurring" && !editing ? (
            <label className="flex flex-col gap-1 text-sm text-muted">
              {t("me.endMonth")}
              <input
                name="endMonth"
                type="month"
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              />
            </label>
          ) : null}
          {entryKind === "installment" && !editing ? (
            <>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("me.installmentCount")}
                <input
                  name="installmentCount"
                  type="number"
                  min="2"
                  max="120"
                  required
                  defaultValue={12}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                {t("me.firstInstallmentNumber")}
                <input
                  name="firstInstallmentNumber"
                  type="number"
                  min="1"
                  max="120"
                  required
                  defaultValue={1}
                  className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
                />
              </label>
            </>
          ) : null}

          {!isSaving ? (
            <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
              {t("me.visibility")}
              <select
                name="visibility"
                required
                defaultValue={editing?.visibility ?? "personal"}
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              >
                <option value="personal">{t("me.personal")}</option>
                <option value="shared">{t("me.shared")}</option>
              </select>
            </label>
          ) : (
            <input type="hidden" name="visibility" value="personal" />
          )}

          <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
            {t("me.description")}
            <input
              name="description"
              defaultValue={editing?.description}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
            disabled={formBusy || (isSaving && pots.length === 0)}
          >
            {pending ? <Spinner /> : null}
            {pending ? t("me.saving") : editing ? t("me.save") : t("me.add")}
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-fg disabled:opacity-70"
            disabled={formBusy}
            onClick={onClose}
          >
            {t("me.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
