import { hashPassword, verifyPassword } from "./password.js";

const stored = await hashPassword("correct-horse");

const acceptsGood = await verifyPassword("correct-horse", stored);
const rejectsBad = !(await verifyPassword("wrong-password", stored));
const rejectsJunk = !(await verifyPassword("correct-horse", "not-a-hash"));

if (!acceptsGood || !rejectsBad || !rejectsJunk) {
  throw new Error("password hash/verify check failed");
}

console.log("password check ok");
