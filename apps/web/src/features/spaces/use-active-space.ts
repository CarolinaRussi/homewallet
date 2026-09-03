import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SpaceSummary } from "@homewallet/shared";
import { fetchSpaces } from "./space-api";

const STORAGE_KEY = "hw_active_space";

function readActiveSpaceId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function writeActiveSpaceId(spaceId: string) {
  localStorage.setItem(STORAGE_KEY, spaceId);
}

export function useActiveSpace() {
  const spacesQuery = useQuery({ queryKey: ["spaces"], queryFn: fetchSpaces });
  const [spaceId, setSpaceId] = useState<string | null>(readActiveSpaceId);

  useEffect(() => {
    const spaces = spacesQuery.data;
    if (!spaces || spaces.length === 0) {
      return;
    }
    const stillValid = spaceId && spaces.some((space) => space.id === spaceId);
    if (!stillValid) {
      const nextId = spaces[0]?.id;
      if (nextId) {
        setSpaceId(nextId);
        writeActiveSpaceId(nextId);
      }
    }
  }, [spacesQuery.data, spaceId]);

  function selectSpace(nextId: string) {
    setSpaceId(nextId);
    writeActiveSpaceId(nextId);
  }

  const activeSpace: SpaceSummary | undefined = spacesQuery.data?.find(
    (space) => space.id === spaceId
  );

  return {
    spacesQuery,
    spaces: spacesQuery.data ?? [],
    activeSpace,
    spaceId,
    selectSpace,
  };
}
