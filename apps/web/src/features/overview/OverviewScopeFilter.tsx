import type { ReactNode } from "react";
import type { OverviewScope, SpaceMemberSummary } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";

type OverviewScopeFilterProps = {
  transparent: boolean;
  scope: OverviewScope;
  memberUserId: string | undefined;
  peers: SpaceMemberSummary[];
  onScopeChange: (scope: OverviewScope, memberUserId?: string) => void;
};

function ScopePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-fg"
          : "border border-border bg-bg text-fg hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

export function OverviewScopeFilter({
  transparent,
  scope,
  memberUserId,
  peers,
  onScopeChange,
}: OverviewScopeFilterProps) {
  const { t } = useLocale();

  let hintKey:
    | "overview.scopeHint.me"
    | "overview.scopeHint.shared"
    | "overview.scopeHint.everyone"
    | "overview.scopeHint.member" = "overview.scopeHint.me";

  if (scope === "shared") {
    hintKey = "overview.scopeHint.shared";
  } else if (scope === "everyone") {
    hintKey = "overview.scopeHint.everyone";
  } else if (scope === "member") {
    hintKey = "overview.scopeHint.member";
  }

  const memberName =
    peers.find((peer) => peer.userId === memberUserId)?.name ?? "";

  return (
    <div
      role="radiogroup"
      aria-label={t("overview.scope")}
      className="flex flex-col gap-2"
    >
      <p className="text-sm font-medium text-fg">{t("overview.scopeLabel")}</p>
      <div className="flex flex-wrap gap-2">
        <ScopePill active={scope === "me"} onClick={() => onScopeChange("me")}>
          {t("overview.scope.me")}
        </ScopePill>
        {transparent ? (
          <>
            <ScopePill
              active={scope === "everyone"}
              onClick={() => onScopeChange("everyone")}
            >
              {t("overview.scope.everyone")}
            </ScopePill>
            {peers.map((peer) => (
              <ScopePill
                key={peer.userId}
                active={scope === "member" && memberUserId === peer.userId}
                onClick={() => onScopeChange("member", peer.userId)}
              >
                {peer.name}
              </ScopePill>
            ))}
          </>
        ) : (
          <ScopePill
            active={scope === "shared"}
            onClick={() => onScopeChange("shared")}
          >
            {t("overview.scope.shared")}
          </ScopePill>
        )}
      </div>
      <p className="text-xs text-muted">
        {scope === "member" && memberName
          ? t(hintKey).replace("{name}", memberName)
          : t(hintKey)}
      </p>
    </div>
  );
}
