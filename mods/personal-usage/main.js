// Claude Code and Codex plan usage at the foot of the sidebar: one bar per limit window.
// Reads shared "cc.usage" (cc-status fetches it); a click asks for fresh numbers.

import { claudeUsage, codexUsage, USAGE_EVERY, backoff } from "./usage.js";

import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { theme, run, checking } from "herdr";

const AGENTS = [{ key: "claude", name: "Claude" }, { key: "codex", name: "Codex" }];
const ROW = 44, HEAD = 22, PAD = 20, GAP = 8;

// "resets in 25m", "resets at 14:20" (today), "resets on Mon 02:29" (another day).
function resets(at) {
  if (!at) return "";
  const m = Math.round((at - Date.now()) / 60_000);
  if (m <= 0) return "resetting now";
  if (m < 60) return `resets in ${m}m`;
  const d = new Date(at), time = d.toTimeString().slice(0, 5);
  if (d.toDateString() === new Date().toDateString()) return `resets at ${time}`;
  return `resets on ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]} ${time}`;
}

export default class Usage extends View {
  init(_props, cx) {
    this.height = 0;
    this.data = {};
    this.next = 0;
    this.failures = 0;
    if (checking()) return;
    this.refresh(cx);
    cx.timer.every(60_000, (cx) => { this.refresh(cx); cx.notify(); });
  }

  refresh(cx) {
    if (this.busy || Date.now() < this.next) return;
    this.busy = true;
    this.next = Date.now() + USAGE_EVERY;
    cx.spawn(async (cx) => {
      try {
        this.data.claude = { windows: await claudeUsage() };
        this.failures = 0;
      } catch (e) {
        this.next = Date.now() + backoff(++this.failures, e.retryAfter);
        this.data.claude = { ...this.data.claude, error: String(e.message ?? e) };
      }
      try {
        this.data.codex = { windows: await codexUsage() };
      } catch (e) {
        this.data.codex = { ...this.data.codex, error: String(e.message ?? e) };
      } finally {
        this.busy = false;
        cx.notify();
      }
    });
  }

  render(cx) {
    const t = theme();
    const data = this.data;
    const shown = AGENTS.filter((a) => data[a.key]?.windows?.length || data[a.key]?.error);

    // The block fits its rows: grow or shrink it when an agent's limits appear or go.
    const height = shown.length ? PAD + GAP * (shown.length - 1) + shown.reduce((h, a) => h + HEAD + (data[a.key].windows?.length ?? 0) * ROW, 0) : 0;
    if (height !== this.height) {
      this.height = height;
      cx.spawn(async () => { run("layout.resize", { id: "usage", px: Math.max(height, 1) }); });
    }

    // Name and percentage (what you glance at), the bar, then when it frees up.
    const bar = (w, key) => {
      const color = w.used >= 90 ? t.blocked : w.used >= 70 ? t.working : t.muted;
      return v_flex().id(key).h(ROW).justify_center().gap(4)
        .child(h_flex().justify_between().text_size(11.5)
          .child(div().text_color(t.muted).child(w.label))
          .child(div().font_medium().text_color(w.used >= 70 ? color : t.foreground).child(`${Math.round(w.used)}%`)))
        .child(div().h(5).w_full().rounded(3).bg(t.raised)
          .child(div().h(5).rounded(3).bg(color).w(`${Math.max(2, w.used)}%`)))
        .when(Boolean(w.resetsAt), (el) => el.child(div().text_size(10.5).text_color(t.dim).truncate().child(resets(w.resetsAt))));
    };

    return v_flex().id("cc-usage").size_full().px(14).py(10).gap(GAP).bg(t.chrome).border_t(1).border_color(t.border)
      .on_click((_event, cx) => this.refresh(cx))
      .children(shown.map((a) => v_flex()
        .child(h_flex().h(HEAD).items_center().gap(6).text_size(11.5)
          .child(div().font_medium().text_color(t.foreground).child(a.name))
          .when(Boolean(data[a.key].error), (el) => el.child(div().flex_1().min_w(0).truncate().text_size(10.5).text_color(t.blocked).child(data[a.key].error))))
        .children((data[a.key].windows ?? []).map((w, n) => bar(w, `${a.key}-${n}`)))));
  }
}
