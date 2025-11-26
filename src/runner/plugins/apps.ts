import { execApp, getAstalApps, lookupIcon, updateApps } from "../../modules/apps";
import { Runner } from "../Runner";

export const PluginApps = {
    // Do not provide prefix, so it always runs.
    name: "Apps",
    // asynchronously-refresh apps list on init
    init: async () => updateApps(),
    handle: (text: string) => {
        return getAstalApps().fuzzy_query(text).map(app => ({
                title: app.get_name(),
                description: app.get_description(),
                icon: (app.iconName && lookupIcon(app.iconName)) ? app.iconName : "application-x-executable-symbolic",
                actionClick: () => execApp(app)
            })
        );
    }
} as Runner.Plugin;
