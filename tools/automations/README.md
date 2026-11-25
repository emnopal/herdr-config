# Automations CLI

Source: https://github.com/DnzzL/herdr-automations

Installed from commit `05e46298479fc3bca5735e98b34762377017af6b` with Go 1.27.4 to `~/.local/bin/herdr-automations`. The login service is `~/Library/LaunchAgents/dev.dnzzl.herdr-automations.plist`.

Rebuild on another machine with Go 1.26 or newer:

```sh
rtk proxy env GOBIN="$HOME/.local/bin" go install github.com/DnzzL/herdr-automations@05e46298479fc3bca5735e98b34762377017af6b
```

If no configuration exists, create `~/.config/herdr/plugins/config/dnzzl.automations/automations.yaml` from `automations.example.yaml`. Preserve existing tasks. Then install the scheduler with `rtk proxy herdr-automations service install`. Verify with `rtk proxy herdr-automations ls --json` and `rtk proxy herdr-automations service status`.

This machine has an empty task list. No agent runs are created by installing the service. Tasks you add later can run agents on schedule. Remove the login service with `rtk proxy herdr-automations service uninstall`.
