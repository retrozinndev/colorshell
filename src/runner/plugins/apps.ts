import { execApp, getAstalApps, updateApps } from "../../modules/apps";
import Runner from "..";
import AppIcon from "../../widget/AppIcon";

export class PluginApps implements Runner.Plugin {
    // Do not provide prefix, so it always runs.
    name = "Apps";

    // asynchronously-refresh apps list on init
    async init(): Promise<void> {
        updateApps();
    }

    handle(text: string) {
        return getAstalApps().fuzzy_query(text).map(app => {
            let icon: AppIcon = new AppIcon({
                icon: app.iconName
            });

            return {
                title: app.get_name(),
                description: app.get_description(),
                onClicked: () => execApp(app),
                icon
            } satisfies Runner.Result;
        });
    }
}
