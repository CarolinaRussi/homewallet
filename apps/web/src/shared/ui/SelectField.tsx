import type { ReactNode, SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
  /** Form fields use inset bg; toolbar filters use surface (default). */
  variant?: "surface" | "field";
};

export function SelectField({
  label,
  children,
  variant = "surface",
  className = "",
  ...selectProps
}: SelectFieldProps) {
  const selectClass =
    variant === "field"
      ? `hw-select-field ${className}`.trim()
      : `hw-select ${className}`.trim();

  return (
    <label className="flex min-w-[9rem] flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select className={selectClass} {...selectProps}>
        {children}
      </select>
    </label>
  );
}
