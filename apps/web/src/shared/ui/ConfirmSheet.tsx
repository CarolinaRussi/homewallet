import { useEffect, useId, useState, type ReactNode } from "react";
import { Spinner } from "./Spinner";

const EXIT_MS = 220;

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
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setPresent(false), EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!present) {
    return null;
  }

  return (
    <div
      className={`hw-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 ${
        visible ? "hw-overlay-in" : "hw-overlay-out"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          onClose();
        }
      }}
    >
      <div
        className={`hw-sheet flex w-full max-w-md flex-col gap-4 rounded-t-2xl border border-border bg-surface p-5 shadow-lg sm:rounded-lg ${
          visible ? "hw-sheet-in" : "hw-sheet-out"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
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
                danger
                  ? "bg-expense text-expense-fg"
                  : "bg-accent text-accent-fg"
              }`}
              disabled={pending || !onConfirm}
              onClick={onConfirm}
            >
              {pending ? <Spinner /> : null}
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
