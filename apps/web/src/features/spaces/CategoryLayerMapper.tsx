import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BudgetLayer } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { fetchCategories } from "../entries/entry-api";
import { updateCategoryLayer } from "./space-api";

export function CategoryLayerMapper({ spaceId }: { spaceId: string }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["categories", spaceId],
    queryFn: () => fetchCategories(spaceId),
  });

  const layerMutation = useMutation({
    mutationFn: ({
      categoryId,
      budgetLayer,
    }: {
      categoryId: string;
      budgetLayer: BudgetLayer | null;
    }) => updateCategoryLayer(spaceId, categoryId, budgetLayer),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["categories", spaceId],
      });
      void queryClient.invalidateQueries({ queryKey: ["month-summary"] });
    },
  });

  if (!categoriesQuery.data?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <p className="text-xs text-muted">{t("limits.layersMapHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {categoriesQuery.data.map((category) => (
          <label
            key={category.id}
            className="flex items-center justify-between gap-2 text-sm text-muted"
          >
            <span className="text-fg">{category.name}</span>
            <select
              className="hw-select-field py-1 text-sm disabled:opacity-70"
              value={category.budgetLayer ?? ""}
              disabled={layerMutation.isPending}
              onChange={(event) => {
                const value = event.target.value;
                layerMutation.mutate({
                  categoryId: category.id,
                  budgetLayer:
                    value === "essential" ||
                    value === "personal" ||
                    value === "future"
                      ? value
                      : null,
                });
              }}
            >
              <option value="">{t("limits.layerNone")}</option>
              <option value="essential">{t("limits.layerEssential")}</option>
              <option value="personal">{t("limits.layerPersonal")}</option>
              <option value="future">{t("limits.layerFuture")}</option>
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
