export function isHistorySoloSpace(
  space: { memberCount: number },
  spaces: { memberCount: number }[]
) {
  return (
    space.memberCount === 1 && spaces.some((item) => item.memberCount >= 2)
  );
}

export function pickHomeSpaceId<T extends { id: string; memberCount: number }>(
  spaces: T[]
): string | undefined {
  return spaces.find((space) => space.memberCount >= 2)?.id ?? spaces[0]?.id;
}
