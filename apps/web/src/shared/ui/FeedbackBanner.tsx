type FeedbackBannerProps = {
  tone: "success" | "error";
  message: string;
  leaving?: boolean;
  sticky?: boolean;
};

/** Project-standard success/error surface — use instead of bare red text. */
export function FeedbackBanner({
  tone,
  message,
  leaving = false,
  sticky = false,
}: FeedbackBannerProps) {
  return (
    <p
      role="status"
      className={[
        "rounded-md border px-3 py-2 text-sm",
        leaving ? "hw-feedback-out" : "hw-feedback",
        sticky ? "sticky top-2 z-10" : "",
        tone === "success"
          ? "border-accent bg-income text-income-fg"
          : "border-expense-fg/30 bg-expense text-expense-fg",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {message}
    </p>
  );
}
