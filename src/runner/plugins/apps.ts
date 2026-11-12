import { execApp } from "../../modules/apps";
import { searchApps } from "../../modules/app-search";
import Runner from "..";
import AppIcon from "../../widget/AppIcon";

export class PluginApps implements Runner.Plugin {
    // Do not provide prefix, so it's always ran
    name = "Apps";

    handle(text: string, limit?: number) {
        return searchApps(text, limit).map(app => {
            const icon = new AppIcon({
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
