// Antigravity: the CLI's own read-only `/usage` command (`agy --output-format json -p "/usage"`).
// The CLI authenticates itself; nothing here sees a token.
import { makeWindow, okReport, errorReport, unavailableReport, toEpoch, jsonLines } from "../lib/report.js";

const SOURCE = "agy CLI";
const HOUR = 3600;
const WEEK = 7 * 24 * HOUR;

function groupPrefix(groupName) {
  const s = String(groupName ?? "").trim();
  if (!s || /^gemini\b/i.test(s)) return null;
  if (/^claude\s+and\s+gpt\b/i.test(s)) return "Claude/GPT";
  return s.replace(/\s+models$/i, "");
}

function windowShape(w, name) {
  const kind = String(w ?? "").toLowerCase();
  if (kind === "5h" || /five\s*hour|5-hour/i.test(name ?? "")) return { short: "5h", long: "5-hour", durationSec: 5 * HOUR };
  if (kind === "weekly" || /weekly/i.test(name ?? "")) return { short: "wk", long: "Weekly", durationSec: WEEK };
  const label = String(w || name || "limit");
  return { short: label, long: label, durationSec: null };
}

function windowFromBucket(groupName, b) {
  if (!b || b.disabled || b.remaining_fraction == null) return null;
  const rem = Number(b.remaining_fraction);
  if (!Number.isFinite(rem)) return null;
  const percent = Math.max(0, Math.min(100, (1 - rem) * 100));
  const rawReset = toEpoch(b.reset_time);
  const resetsAt = rawReset && rawReset > 0 ? rawReset : null;
  const prefix = groupPrefix(groupName);
  const { short, long, durationSec } = windowShape(b.window, b.name);
  // Skip untouched auxiliary groups (e.g. 3p at 100% remaining with epoch-0 reset) unless active.
  if (prefix && rem >= 1 && !resetsAt) return null;
  return makeWindow({
    id: String(b.id || `${prefix ?? "gemini"}:${short}`),
    short: prefix ? `${prefix} ${short}` : short,
    long: prefix ? `${prefix} · ${long}` : long,
    percent,
    resetsAt,
    durationSec,
  });
}

export function parse(text, now) {
  const msg = jsonLines(text).find((m) => m.command?.name === "usage" || m.status != null);
  if (!msg) return errorReport(SOURCE, "No reply from the agy CLI", now);
  if (msg.status && msg.status !== "SUCCESS") {
    return errorReport(SOURCE, String(msg.error ?? msg.response ?? "agy CLI could not read usage"), now);
  }
  const groups = msg.command?.data?.groups;
  if (!Array.isArray(groups)) return errorReport(SOURCE, "No quota groups in agy reply", now);
  const windows = groups
    .flatMap((g) => (g?.buckets ?? []).map((b) => windowFromBucket(g.name, b)).filter(Boolean))
    .sort((a, b) => (a.durationSec ?? Infinity) - (b.durationSec ?? Infinity));
  if (windows.length === 0) return unavailableReport(SOURCE, "No quota limits", now);
  return okReport(SOURCE, now, windows, msg.command?.data?.plan ?? null);
}

export default {
  id: "antigravity",
  name: "Antigravity",
  icon: "icons/antigravity.svg",
  helper: "helpers/agy-usage.sh",
  parse,
};
