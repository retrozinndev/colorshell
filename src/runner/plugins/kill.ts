import { execAsync } from "ags/process";
import Runner from "..";
import Notifications from "../../modules/notifications";


export class PluginKill implements Runner.Plugin {
    name = "Killer";
    prefix = ":k";
    prioritize = true;

    handle(_: string) {
        return {
            title: "Select a client to kill",
            closeOnClick: true,
            icon: "window-close-symbolic",
            onClicked: () => execAsync("hyprctl kill").catch((e) =>
                Notifications.getDefault().sendNotification({
                    summary: "Couldn't kill client",
                    body: `An error occurred while trying to kill a client! Stderr: ${e}`
                })
            )
        } satisfies Runner.Result;
    }
}
