import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import AstalApps from "gi://AstalApps";
import { execApp, getAstalApps, lookupIcon, updateApps } from "../../scripts/apps";
import { Runner } from "../Runner";

export const PluginApps = {
    // Do not provide prefix, so it always runs.
    name: "Apps",
    // asynchronously-refresh apps list on init
    init: async () => updateApps(),
    handle: (text: string) => {
        return getAstalApps().fuzzy_query(text).map((app: AstalApps.Application) =>
            new ResultWidget({
                title: app.get_name(),
                description: app.get_description(),
                icon: lookupIcon(app.iconName) ? app.iconName : "application-x-executable-symbolic",
                onClick: () => execApp(app)
            } as ResultWidgetProps)
        );
    }
} as Runner.Plugin;
