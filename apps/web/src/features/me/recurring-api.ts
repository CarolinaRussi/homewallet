import type {
  CreateInstallmentPlanBody,
  CreateRecurringRuleBody,
  InstallmentPlanSummary,
  RecurringRuleSummary,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function createRecurringRule(
  spaceId: string,
  body: CreateRecurringRuleBody
) {
  return api<RecurringRuleSummary>(`/spaces/${spaceId}/recurring-rules`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteRecurringRule(ruleId: string) {
  return api<void>(`/recurring-rules/${ruleId}`, { method: "DELETE" });
}

export function createInstallmentPlan(
  spaceId: string,
  body: CreateInstallmentPlanBody
) {
  return api<InstallmentPlanSummary>(`/spaces/${spaceId}/installment-plans`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
