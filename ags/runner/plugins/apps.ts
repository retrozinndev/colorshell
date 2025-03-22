import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import AstalApps from "gi://AstalApps";
import { cleanExec, getAstalApps } from "../../scripts/apps";
import { Runner } from "../Runner";
import { Astal } from "astal/gtk3";

export const PluginApps = {
    // Do not provide prefix, so it's always ran.
    name: "Apps",
    handle: (text: string) => {
        return getAstalApps().fuzzy_query(text).map((app: AstalApps.Application) =>
            new ResultWidget({
                title: app.get_name(),
                description: app.get_description(),
                icon: Astal.Icon.lookup_icon(app.iconName) ? app.iconName : "application-x-executable-symbolic",
                onClick: () => cleanExec(app)
            } as ResultWidgetProps)
        );
    }
} as Runner.Plugin;
