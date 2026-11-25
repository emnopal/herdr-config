const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync("mods/personal-usage/main.js", "utf8")
  .replace(/^import .*;$/gm, "").replace("export default class Usage", "class Usage") + "\nthis.Usage = Usage;";

test("usage skips checks, keeps last readings on failure, and throttles retries", async () => {
  let checks = true, calls = 0, fail = false, pending;
  const context = { View: class {}, checking: () => checks, USAGE_EVERY: 180000,
    backoff: () => 900000,
    claudeUsage: async () => { calls++; if (fail) throw new Error("offline"); return [{ used: 42 }]; },
    codexUsage: async () => [{ used: 27 }] };
  vm.createContext(context); vm.runInContext(source, context);
  const cx = { timer: { every() {} }, notify() {}, spawn(fn) { pending = fn(cx); } };
  const usage = new context.Usage(); usage.init({}, cx); assert.equal(calls, 0);
  checks = false; usage.init({}, cx); await pending;
  assert.equal(usage.data.claude.windows[0].used, 42);
  usage.refresh(cx); assert.equal(calls, 1);
  usage.next = 0; fail = true; usage.refresh(cx); await pending;
  assert.equal(usage.data.claude.windows[0].used, 42);
  assert.equal(usage.data.claude.error, "offline");
  assert.equal(usage.busy, false); assert.ok(usage.next > Date.now());
});
