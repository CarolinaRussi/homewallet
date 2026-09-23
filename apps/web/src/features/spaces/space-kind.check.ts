import { isHistorySoloSpace, pickHomeSpaceId } from "./space-kind";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  isHistorySoloSpace({ memberCount: 1 }, [
    { memberCount: 1 },
    { memberCount: 2 },
  ]),
  "solo leftover next to a household is history"
);

assert(
  !isHistorySoloSpace({ memberCount: 2 }, [
    { memberCount: 1 },
    { memberCount: 2 },
  ]),
  "household is not history"
);

assert(
  !isHistorySoloSpace({ memberCount: 1 }, [{ memberCount: 1 }]),
  "only-solo life is not leftover history"
);

assert(
  !isHistorySoloSpace({ memberCount: 1 }, [
    { memberCount: 1 },
    { memberCount: 1 },
  ]),
  "two solos without a household are not history leftovers"
);

assert(
  pickHomeSpaceId([
    { id: "solo", memberCount: 1 },
    { id: "house", memberCount: 2 },
  ]) === "house",
  "household wins over leftover solo"
);

assert(
  pickHomeSpaceId([{ id: "solo", memberCount: 1 }]) === "solo",
  "only-solo life stays on that space"
);

console.log("space-kind check ok");
