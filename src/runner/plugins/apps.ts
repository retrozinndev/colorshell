import { execApp, getApps } from "../../modules/apps";
import Runner from "..";
import AppIcon from "../../widget/AppIcon";

export class PluginApps implements Runner.Plugin {
    // Do not provide prefix, so it's always ran
    name = "Apps";

    handle(text: string) {
        return getApps().fuzzy_query(text).map(app => {
            let icon: AppIcon = new AppIcon({
                icon: app.iconName
            });

            return {
                title: app.name,
                description: app.description,
                onClicked: () => execApp(app),
                icon
            } satisfies Runner.Result;
        });
    }
}
