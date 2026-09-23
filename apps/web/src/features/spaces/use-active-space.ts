import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SpaceSummary } from "@homewallet/shared";
import { fetchSpaces } from "./space-api";
import { isHistorySoloSpace, pickHomeSpaceId } from "./space-kind";

const STORAGE_KEY = "hw_active_space";

export function clearStoredActiveSpace() {
  localStorage.removeItem(STORAGE_KEY);
}

export function setStoredActiveSpace(spaceId: string) {
  localStorage.setItem(STORAGE_KEY, spaceId);
}

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
    if (!spaces) {
      return;
    }
    if (spaces.length === 0) {
      if (spaceId) {
        setSpaceId(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }
    const current = spaceId
      ? spaces.find((space) => space.id === spaceId)
      : undefined;
    if (!current && spaceId && spacesQuery.isFetching) {
      return;
    }
    if (current && !isHistorySoloSpace(current, spaces)) {
      return;
    }
    const nextId = pickHomeSpaceId(spaces);
    if (nextId && nextId !== spaceId) {
      setSpaceId(nextId);
      writeActiveSpaceId(nextId);
    }
  }, [spacesQuery.data, spacesQuery.isFetching, spaceId]);

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
