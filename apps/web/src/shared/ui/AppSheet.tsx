import { useEffect, useState, type ReactNode } from "react";

const EXIT_MS = 220;

type AppSheetProps = {
  open: boolean;
  onClose: () => void;
  /** When true, backdrop click does not close. */
  pending?: boolean;
  labelledBy?: string;
  /** Wider sheet for forms (default: confirm size). */
  size?: "md" | "lg";
  children: ReactNode;
};

/**
 * Animated overlay + sheet. Keep mounted until exit finishes.
 * Bottom drawer on mobile; centered from `sm` up.
 */
export function AppSheet({
  open,
  onClose,
  pending = false,
  labelledBy,
  size = "md",
  children,
}: AppSheetProps) {
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
      aria-labelledby={labelledBy}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          onClose();
        }
      }}
    >
      <div
        className={`hw-sheet flex w-full flex-col gap-4 rounded-t-2xl border border-border bg-surface p-5 shadow-lg sm:rounded-lg ${
          size === "lg" ? "max-w-xl" : "max-w-md"
        } ${visible ? "hw-sheet-in" : "hw-sheet-out"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        {children}
      </div>
    </div>
  );
}
