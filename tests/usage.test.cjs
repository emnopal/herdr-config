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
    codexUsage: async () => [{ used: 27 }],
    agyUsage: async () => [{ used: 8 }] };
  vm.createContext(context); vm.runInContext(source, context);
  const cx = { timer: { every() {} }, notify() {}, spawn(fn) { pending = fn(cx); } };
  const usage = new context.Usage(); usage.init({}, cx); assert.equal(calls, 0);
  checks = false; usage.init({}, cx); await pending;
  assert.equal(usage.data.claude.windows[0].used, 42);
  assert.equal(usage.data.antigravity.windows[0].used, 8);
  usage.refresh(cx); assert.equal(calls, 1);
  usage.next = 0; fail = true; usage.refresh(cx); await pending;
  assert.equal(usage.data.claude.windows[0].used, 42);
  assert.equal(usage.data.claude.error, "offline");
  assert.equal(usage.busy, false); assert.ok(usage.next > Date.now());
});

test("antigravity usage-limits provider parses agy /usage JSON and skips idle 3p epoch-0 buckets", async () => {
  const { parse } = await import("../mods/usage-limits/providers/antigravity.js");
  const sample = JSON.stringify({
    status: "SUCCESS",
    command: {
      name: "usage",
      data: {
        groups: [
          {
            name: "Gemini Models",
            buckets: [
              { id: "gemini-weekly", name: "Weekly Limit Remaining", window: "weekly", remaining_fraction: 0.924, reset_time: "2026-12-04T12:59:25Z" },
              { id: "gemini-5h", name: "Five Hour Limit Remaining", window: "5h", remaining_fraction: 0.724, reset_time: "2026-11-27T17:59:25Z" },
            ],
          },
          {
            name: "Claude and GPT models",
            buckets: [
              { id: "3p-weekly", name: "Weekly Limit Remaining", window: "weekly", remaining_fraction: 1, reset_time: "1970-01-01T00:00:00Z" },
            ],
          },
        ],
      },
    },
  });
  const report = parse(sample, 1795780000);
  assert.equal(report.status, "ok");
  assert.deepEqual(report.windows.map((w) => ({ id: w.id, short: w.short, long: w.long, percent: w.percent })), [
    { id: "gemini-5h", short: "5h", long: "5-hour", percent: 28 },
    { id: "gemini-weekly", short: "wk", long: "Weekly", percent: 8 },
  ]);
});
