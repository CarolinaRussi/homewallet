import { layerTargets, progressToward } from "@homewallet/shared";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const progress = progressToward(120, 100);
assert(progress.overBy === 20, "overBy");
assert(progress.remaining === 0, "remaining when over");

const under = progressToward(40, 100);
assert(under.remaining === 60, "remaining under");
assert(under.overBy === 0, "no over");

const targets = layerTargets(1000);
assert(targets.essential === 500, "50%");
assert(targets.personal === 400, "40%");
assert(targets.future === 100, "10%");

console.log("limits check ok");
