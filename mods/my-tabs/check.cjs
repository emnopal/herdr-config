// node mods/my-tabs/check.cjs: the tab bar's sidebar button, and a rail turning into a hide.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function element() {
  const node = { items: [], handlers: {}, style: {} };
  const proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    return (...args) => {
      if (key === "when") { if (args[0]) args[1](proxy); }
      else if (key === "child") node.items.push(args[0]);
      else if (key === "children") node.items.push(...args[0]);
      else if (key.startsWith("on_")) node.handlers[key] = args.at(-1);
      else if (key === "id") node.key = args[0];
      else node.style[key] = args[0];
      return proxy;
    };
  } });
  return proxy;
}
const find = (node, id) => !node || typeof node !== "object" ? null : node.key === id ? node : node.items.map(c => find(c, id)).find(Boolean) ?? null;

const state = {}, calls = [];
let sidebar;
let hideExcalidraw = false;
let gitGraph = false;
let betterPanels = false;
const env = {
  props: () => ({ hideExcalidraw, gitGraph, betterPanels }),
  View: class {}, div: element, v_flex: element, h_flex: element, svg: element, image: element,
  theme: () => new Proxy({}, { get: () => "#000" }), settings: () => ({ zoom: 1 }), window: () => ({ platform: "macos" }),
  layout: () => ({ id: "root", children: [sidebar, { id: "panel", hidden: true, children: [{ id: "panel-body", children: [{ id: "graph" }, { id: "pull-requests" }, { id: "linear-issues" }, { id: "git-controls" }] }] }] }), shared: (k) => state[k],
  run: (name, args) => calls.push([name, JSON.parse(JSON.stringify(args))]), spaces: () => [], panes: () => [], focused: () => null,
  openOverlay() {}, exec() {}, nextCommand: () => new Promise(() => {}),
  localStorage: { getItem: () => null, setItem() {} },
};
const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Mod = class");
const context = vm.createContext(env);
vm.runInContext(source, context);
const tabs = new context.Mod();
tabs.init({}, { spawn() {} });

// Shown at full width: the button hides it, and says so.
sidebar = { id: "sidebar", size: { px: 268 } };
let button = find(tabs.render(), "sidebar-toggle");
assert.equal(button.style.tooltip, "Hide sidebar");
button.handlers.on_click();
assert.deepEqual(calls, [["layout.toggle", { id: "sidebar" }]]);

// Hidden: the button is still there, to show it again.
calls.length = 0;
sidebar = { id: "sidebar", hidden: true, size: { px: 268 } };
assert.equal(find(tabs.render(), "sidebar-toggle").style.tooltip, "Show sidebar");
assert.deepEqual(calls, [], "hidden is left alone");

// Herdr's brand button made a rail: hidden instead, back at the width it saved.
state["sidebar.width"] = 300;
sidebar = { id: "sidebar", size: { px: 76 } };
tabs.render();
assert.deepEqual(calls, [["layout.resize", { id: "sidebar", px: 300 }], ["layout.hide", { id: "sidebar" }]]);

// An old saved rail with no width to go back to: the layout's default.
calls.length = 0;
delete state["sidebar.width"];
tabs.render();
assert.equal(calls[0][1].px, 268);

sidebar = { id: "sidebar", size: { px: 268 } };
assert.ok(find(tabs.render(), "excalidraw"));
hideExcalidraw = true;
assert.equal(find(tabs.render(), "excalidraw"), null);
gitGraph = true;
calls.length = 0;
find(tabs.render(), "panel-graph").handlers.on_click();
assert.deepEqual(calls, [["layout.select", { stack: "panel-body", child: "graph" }], ["layout.show", { id: "panel" }]]);
assert.equal(find(tabs.render(), "detailed-git-graph"), null);
betterPanels = true;
for (const child of ["git-controls"]) {
  calls.length = 0;
  find(tabs.render(), `panel-${child}`).handlers.on_click();
  assert.deepEqual(calls, [["layout.select", { stack: "panel-body", child }], ["layout.show", { id: "panel" }]]);
}
calls.length = 0;
find(tabs.render(), "better-search").handlers.on_click();
assert.deepEqual(calls, [["mod.open", { name: "better-search" }]]);
assert.equal(find(tabs.render(), "panel-pull-requests"), null);
assert.equal(find(tabs.render(), "panel-linear-issues"), null);
env.props = () => ({ gitTools: true, issuesPanel: true });
const navigationSource = fs.readFileSync(path.join(__dirname, "../sidebar-nav/main.js"), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Navigation = class");
vm.runInContext(navigationSource, context);
const navigation = new context.Navigation(); navigation.init();
calls.length = 0;
find(navigation.render(), "nav-git-graph").handlers.on_click();
assert.equal(calls[0][0], "tab.new");
assert.equal(calls[0][1].mod, "git-graph");
assert.equal(calls[0][1].name, "Detailed Git Graph");
console.log("my-tabs and sidebar navigation: ok");
