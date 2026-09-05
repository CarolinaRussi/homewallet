import { earliestMonth } from "./month-snapshot.build.js";

type RebuildRunner = (
  userId: string,
  spaceId: string,
  fromMonth: string
) => Promise<void>;

type MemberRebuildState = {
  pendingFrom: string | null;
  running: boolean;
};

function memberKey(spaceId: string, userId: string) {
  return `${spaceId}:${userId}`;
}

function parseMemberKey(key: string) {
  const separator = key.indexOf(":");
  return {
    spaceId: key.slice(0, separator),
    userId: key.slice(separator + 1),
  };
}

export function createMonthSnapshotQueue(rebuildFrom: RebuildRunner) {
  const byMember = new Map<string, MemberRebuildState>();

  function stateFor(spaceId: string, userId: string) {
    const key = memberKey(spaceId, userId);
    let state = byMember.get(key);
    if (!state) {
      state = { pendingFrom: null, running: false };
      byMember.set(key, state);
    }
    return { key, state };
  }

  function isStale(spaceId: string, userId: string, month: string) {
    const state = byMember.get(memberKey(spaceId, userId));
    if (!state?.pendingFrom) {
      return false;
    }
    return month >= state.pendingFrom;
  }

  async function runFlush(key: string) {
    const state = byMember.get(key);
    if (!state || state.running) {
      return;
    }

    state.running = true;
    try {
      for (;;) {
        const fromMonth = state.pendingFrom;
        if (!fromMonth) {
          break;
        }
        state.pendingFrom = null;
        const { spaceId, userId } = parseMemberKey(key);
        try {
          await rebuildFrom(userId, spaceId, fromMonth);
        } catch (error) {
          state.pendingFrom = state.pendingFrom
            ? earliestMonth(state.pendingFrom, fromMonth)
            : fromMonth;
          console.error("month snapshot rebuild failed", error);
          break;
        }
      }
    } finally {
      state.running = false;
      if (state.pendingFrom) {
        setImmediate(() => {
          void runFlush(key);
        });
      }
    }
  }

  function schedule(userId: string, spaceId: string, fromMonth: string) {
    const { key, state } = stateFor(spaceId, userId);
    state.pendingFrom = state.pendingFrom
      ? earliestMonth(state.pendingFrom, fromMonth)
      : fromMonth;

    if (!state.running) {
      setImmediate(() => {
        void runFlush(key);
      });
    }
  }

  return { schedule, isStale };
}

export type MonthSnapshotQueue = ReturnType<typeof createMonthSnapshotQueue>;
