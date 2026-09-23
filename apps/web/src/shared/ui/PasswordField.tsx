import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useLocale } from "../lib/i18n/locale-context";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
};

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 12s3.4-6.5 9.5-6.5S21.5 12 21.5 12s-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      {crossed ? <path d="M5 19.5 19 4.5" /> : null}
    </svg>
  );
}

export function PasswordField({
  label,
  className = "",
  ...inputProps
}: PasswordFieldProps) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? t("auth.hidePassword") : t("auth.showPassword");

  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <span className="relative block">
        <input
          {...inputProps}
          type={visible ? "text" : "password"}
          className={`w-full rounded-md border border-border bg-surface px-3 py-2 pr-11 text-fg ${className}`.trim()}
        />
        <button
          type="button"
          className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-bg hover:text-fg"
          aria-label={toggleLabel}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon crossed={visible} />
        </button>
      </span>
    </label>
  );
}
