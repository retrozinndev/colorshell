import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import AstalHyprland from "gi://AstalHyprland";
import { GLib } from "astal";
import { Runner } from "../Runner";

export const PluginShell = {
    prefix: '!',
    handle: (command: string): ResultWidget => {
        const shell = GLib.getenv("SHELL") || "/usr/bin/env sh";

        return new ResultWidget({
            onClick: () => AstalHyprland.get_default().dispatch("exec", `${shell} -c "${command}"`),
            title: `Run: \`${command}\``,
            description: shell,
            icon: "utilities-terminal-symbolic"
        } as ResultWidgetProps)
    }
} as Runner.Plugin;
