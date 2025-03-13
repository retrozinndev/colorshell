import AstalHyprland from "gi://AstalHyprland";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import AstalApps from "gi://AstalApps";
import { getAstalApps } from "../../scripts/apps";
import { Runner } from "../Runner";

export const PluginApps = {
    // Do not provide prefix, so it's always ran.
    name: "Apps",
    handle: (text: string) => {
        return getAstalApps().fuzzy_query(text).map((app: AstalApps.Application) =>
            new ResultWidget({
                title: app.get_name(),
                description: app.get_description(),
                icon: app.iconName,
                onClick: () => AstalHyprland.get_default().dispatch("exec", app.get_executable())
            } as ResultWidgetProps)
        ) || null;
    }
} as Runner.Plugin;
