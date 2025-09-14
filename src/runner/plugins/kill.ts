import { execAsync } from "ags/process";
import { Runner } from "../Runner";
import { Notifications } from "../../modules/notifications";

export const PluginKill = {
    prefix: ":k",
    handle: () => ({
        title: "Select a client to kill",
        closeOnClick: true,
        icon: "window-close-symbolic",
        actionClick: () => execAsync("hyprctl kill").catch((e) =>
            Notifications.getDefault().sendNotification({
                summary: "Couldn't kill client",
                body: `An error occurred while trying to kill a client! Stderr: ${e}`
            })
        )
    } satisfies Runner.Result)
} satisfies Runner.Plugin;
