# Orca Personal

Orca for Herdr with the original status-bar usage strip, no usage bars in the left sidebar, and no Excalidraw tab-bar button or shortcut. Git Graph toggles Rabeeh’s graph in the right sidebar. Detailed Git Graph opens Werlang’s graph in a full-size tab, reusing the named tab in the current space. Both plugins include Git write actions; use their confirmations carefully. Werlang’s optional cleanup action launches OpenCode. Other Orca features stay in place. The shared tab bar keeps Excalidraw visible in layouts that do not set this option.

`layouts/orca-personal.json` is the layout; `mods/` holds its dependency snapshot, including the custom `personal-usage` mod and a `hideExcalidraw` option in `my-tabs`. `keys.json` contains only this layout’s shortcuts. No credentials, session logs, or application state are included.

The usage mod reads Claude Code’s existing macOS Keychain login and Anthropic’s usage endpoint, and reads Codex’s local session logs. It never stores credentials or starts paid model runs. Refreshes run every three minutes, with failure backoff up to fifteen minutes; clicks respect that cooldown. Old values remain visible on failure alongside the error.

Installed and selected on this machine as `orca-personal`. Existing layouts remain available with Cmd+Shift+L. Config files here are the editable source; copy changed files to `~/.config/herdr-app/` to apply them.

## Install on another machine

Requires Herdr, macOS, Git, Node, and authenticated `gh` for GitHub panels. Optional Orca integrations require their respective CLIs. Back up any existing folders with matching names before copying.

1. Copy `mods/` and `layouts/` into `~/.config/herdr-app/`, preserving their structure. These folders include third-party dependencies; review existing copies before replacing them.
2. Merge the `layout:orca-personal` section from `keys.json` into your app’s `keys.json`, preserving other bindings.
3. Run `rtk proxy herdr-app check ~/.config/herdr-app/mods/<name>` for each copied mod.
4. Run `rtk proxy herdr-app do layout.switch '{"name":"orca-personal"}'`.

## Verify

Run `rtk proxy node --test tests/usage.test.cjs` from this folder. Herdr’s checks and a live screenshot verify the native UI; the unit test covers check-mode isolation, polling cooldown, and retained readings after errors.

## Sources

Based on VladTemp27/herdr-orca, with usage presentation and reader adapted from digitaltracer/herdr-plugins, and Better Changes / Better Config from munza/herdr-mods. Licenses and attribution are in `licenses/`; mod-local notices are preserved.

Graph plugins: https://github.com/rabeeh-ta/herdr-git-graph (installed as `sidebar-git-graph`) and https://github.com/werlang/herdr-git-graph (installed as `git-graph`). Upstream documentation is saved in `licenses/`.

## Insights

The active layout is now `orca-personal-insights` (`layouts/orca-personal-insights.json`), with Insights immediately after Detailed Git Graph. The original `orca-personal` layout remains available. Both layout shortcut sections are included in `keys.json`.

Installed through the upstream installer from https://github.com/GaganSD/coding-agent-toolkit/tree/main/herdr-insights. It reads local session usage and writes metadata under the app’s `data/insights/`; no network uploads or paid model calls. `mods/insights/` is bundled without the machine-specific `runtime.json`. For another machine, use the upstream installer documented in `licenses/insights/INSTALL.md` to select its Node runtime and register ownership. Do not copy the installed runtime path between machines.

## Better panels

Files now uses Better Files; the Search icon opens Better Search (also Cmd+Alt+P). PRs opens Branch PR; Issues and the sidebar Issues link open Branch Issue. The installed Issues provider is GitHub, preserving this machine’s existing choice. Orca’s sidebar, tab bar, resource meter, status usage and both graph plugins remain in place. Branch PR requires authenticated `gh`; GitHub Issues uses the same login. The bundled helper binaries were built for this Mac; rebuild them using the upstream recipes when installing on a different platform.

## Git Controls

Git Controls is a separate right-side panel using the unmodified `git` mod from https://github.com/s16777216/herdr-git. Its toolbar button sits beside the other panel controls. The plugin handles staging, commits, discard, sync, branch selection, stash actions, hunks and the commit graph. Upstream docs and license are in `licenses/git-controls/`.

Better Changes is restored to upstream 2.7.0 code and behavior. Only `mod.json` placement remains `none` because the layouts already provide its slot. All custom source-control menus, operation forms and their tests have been removed. Existing Git Graph and Detailed Git Graph panels remain available.

## Automations

The Automations CLI and login scheduler remain installed and running with an empty `backend: hc` configuration. Installation notes and an empty configuration template are in `tools/automations/`. No scheduled tasks or agent runs were added.

## Toolbar and sidebar

Detailed Git Graph and Insights now open from the left sidebar. Insights uses the plugin’s original toolbar view, moved into the sidebar without changing its code. PRs and Issues buttons are hidden from the top bar; their plugins and panel blocks remain installed, and the sidebar Issues link still works. Files, Changes, Git Graph, Git Controls and Search remain in the top bar.
