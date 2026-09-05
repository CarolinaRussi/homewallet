import { useId, type ReactNode } from "react";
import { AppSheet } from "./AppSheet";
import { Spinner } from "./Spinner";

type ConfirmSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  pending?: boolean;
  /** Simple confirm/cancel footer. Ignored when `children` is set. */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  /** Styles the primary confirm as a destructive action. */
  danger?: boolean;
  /** Custom footer (e.g. multiple choices). Replaces confirm/cancel. */
  children?: ReactNode;
};

/**
 * Themed confirm: bottom drawer on mobile, centered modal from `sm` up.
 * Enter/exit are animated — never mount/unmount abruptly.
 */
export function ConfirmSheet({
  open,
  title,
  description,
  onClose,
  pending = false,
  confirmLabel,
  cancelLabel,
  onConfirm,
  danger = false,
  children,
}: ConfirmSheetProps) {
  const titleId = useId();

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      pending={pending}
      labelledBy={titleId}
    >
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-fg">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-muted">{description}</p>
        ) : null}
      </div>

      {children ? (
        <div className="flex flex-col gap-2">{children}</div>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2.5 text-sm text-fg disabled:opacity-70 sm:py-2"
            disabled={pending}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium disabled:opacity-70 sm:py-2 ${
              danger ? "bg-expense text-expense-fg" : "bg-accent text-accent-fg"
            }`}
            disabled={pending || !onConfirm}
            onClick={onConfirm}
          >
            {pending ? <Spinner /> : null}
            {confirmLabel}
          </button>
        </div>
      )}
    </AppSheet>
  );
}
