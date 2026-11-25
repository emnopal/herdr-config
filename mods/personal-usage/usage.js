// Plan usage for Claude Code and Codex, as Bettr reads it.
// Claude: the usage endpoint /usage uses, with Claude Code's own login from the macOS Keychain. The token is
// only read, never refreshed (refreshing would sign Claude Code out) and never stored.
// Codex: the limits Codex saves in its newest session log.

import { exec, home } from "herdr";

export const USAGE_EVERY = 3 * 60_000;
const MAX_WAIT = 15 * 60_000;

const label = (minutes) => ({ 300: "5-hour", 10080: "Weekly" })[minutes] ?? (minutes ? `${Math.round(minutes / 60)}h` : "Limit");
const clamp = (n) => Math.max(0, Math.min(100, Number(n)));
const ms = (v) => (typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : v ? Date.parse(v) : null);

async function claudeToken() {
  const r = await exec("/usr/bin/security", ["find-generic-password", "-s", "Claude Code-credentials", "-w"], { timeout: 5000 });
  if (r.code !== 0) throw new Error("Claude Code login not found in the Keychain");
  const oauth = JSON.parse(r.stdout).claudeAiOauth ?? {};
  if (!oauth.accessToken || (oauth.expiresAt ?? 0) <= Date.now()) throw new Error("Claude Code login has expired; open Claude Code to renew it");
  return oauth.accessToken;
}

export async function claudeUsage() {
  const token = await claudeToken();
  const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
    headers: { Authorization: `Bearer ${token}`, "anthropic-beta": "oauth-2025-04-20", "User-Agent": "herdr-command-center" },
  });
  if (!res.ok) {
    const e = new Error(`usage endpoint answered ${res.status}`);
    e.retryAfter = Number(res.headers?.get?.("retry-after")) || 0;
    throw e;
  }
  const u = await res.json();
  return [["5-hour", u.five_hour], ["Weekly", u.seven_day]]
    .filter(([, w]) => w && Number.isFinite(Number(w.utilization)))
    .map(([name, w]) => ({ label: name, used: clamp(w.utilization), resetsAt: ms(w.resets_at) }));
}

// The newest rate-limit record in the newest Codex session of the past week; null when there's none.
export async function codexUsage() {
  const dir = `${home()}/.codex/sessions`;
  const script = 'f=$(find "$1" -name "*.jsonl" -type f -mtime -8 -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1); [ -n "$f" ] && tail -c 4000000 "$f" | grep \'"rate_limits"\' | tail -1';
  const r = await exec("sh", ["-c", script, "sh", dir], { timeout: 10_000 }).catch(() => null);
  const line = r?.stdout.trim();
  if (!line) return null;
  const limits = JSON.parse(line).payload?.rate_limits;
  if (!limits) return null;
  return [limits.primary, limits.secondary].filter(Boolean)
    .map((w) => ({ label: label(w.window_minutes), used: clamp(w.used_percent), resetsAt: ms(w.resets_at) }));
}

// Next Claude request after a failure: 3, 6, 12, then 15 minutes, or longer if the server asks.
export const backoff = (failures, retryAfter = 0) => Math.max(Math.min(USAGE_EVERY * 2 ** Math.max(failures - 1, 0), MAX_WAIT), Math.min(retryAfter, 3600) * 1000);
