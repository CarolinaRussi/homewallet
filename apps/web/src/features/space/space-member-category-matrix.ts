import type { EntrySummary } from "@homewallet/shared";

export const UNCATEGORIZED_ID = "_none";

export type SpaceMatrixLineKind = "entry" | "line" | "others";

export type SpaceMatrixLine = {
  entryId: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  occurredOn: string;
  kind: SpaceMatrixLineKind;
};

export type SpaceMatrixCategory = {
  id: string;
  name: string;
};

export type SpaceMemberCategoryMatrix = {
  categories: SpaceMatrixCategory[];
  cells: Map<string, number>;
  lines: Map<string, SpaceMatrixLine[]>;
  memberTotals: Map<string, number>;
  categoryTotals: Map<string, number>;
  grandTotal: number;
  maxCell: number;
};

export function matrixCellKey(userId: string, categoryId: string) {
  return `${userId}\t${categoryId}`;
}

export function buildSpaceMemberCategoryMatrix(
  entries: EntrySummary[]
): SpaceMemberCategoryMatrix {
  const cells = new Map<string, number>();
  const lines = new Map<string, SpaceMatrixLine[]>();
  const memberTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  const categoryNames = new Map<string, string>();

  function addAmount(userId: string, categoryId: string, amount: number) {
    if (amount <= 0) {
      return;
    }
    const key = matrixCellKey(userId, categoryId);
    cells.set(key, (cells.get(key) ?? 0) + amount);
    memberTotals.set(userId, (memberTotals.get(userId) ?? 0) + amount);
    categoryTotals.set(
      categoryId,
      (categoryTotals.get(categoryId) ?? 0) + amount
    );
  }

  function addLine(line: SpaceMatrixLine) {
    if (line.amount <= 0) {
      return;
    }
    categoryNames.set(line.categoryId, line.categoryName);
    addAmount(line.userId, line.categoryId, line.amount);
    const key = matrixCellKey(line.userId, line.categoryId);
    const current = lines.get(key) ?? [];
    current.push(line);
    lines.set(key, current);
  }

  for (const entry of entries) {
    if (entry.type !== "expense") {
      continue;
    }

    const parentId = entry.categoryId ?? UNCATEGORIZED_ID;
    const parentName = entry.categoryName ?? "";

    if (entry.cardLines.length === 0) {
      addLine({
        entryId: entry.id,
        userId: entry.userId,
        categoryId: parentId,
        categoryName: parentName,
        amount: entry.amount,
        description: entry.description,
        occurredOn: entry.occurredOn,
        kind: "entry",
      });
      continue;
    }

    for (const cardLine of entry.cardLines) {
      addLine({
        entryId: entry.id,
        userId: entry.userId,
        categoryId: cardLine.categoryId,
        categoryName: cardLine.categoryName,
        amount: cardLine.amount,
        description: cardLine.description || entry.description,
        occurredOn: entry.occurredOn,
        kind: "line",
      });
    }

    const others = entry.cardOthersAmount ?? 0;
    if (others > 0) {
      addLine({
        entryId: entry.id,
        userId: entry.userId,
        categoryId: parentId,
        categoryName: parentName,
        amount: others,
        description: entry.description,
        occurredOn: entry.occurredOn,
        kind: "others",
      });
    }
  }

  const categories = [...categoryTotals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([id]) => ({
      id,
      name: categoryNames.get(id) ?? "",
    }));

  let maxCell = 0;
  for (const amount of cells.values()) {
    if (amount > maxCell) {
      maxCell = amount;
    }
  }

  const grandTotal = [...memberTotals.values()].reduce(
    (sum, amount) => sum + amount,
    0
  );

  return {
    categories,
    cells,
    lines,
    memberTotals,
    categoryTotals,
    grandTotal,
    maxCell,
  };
}
