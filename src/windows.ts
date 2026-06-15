import { createScopedConnection } from "./modules/utils";
import { AppsWindow } from "./window/apps-window";
import { Bar } from "./window/bar";
import { CenterWindow } from "./window/center-window";
import { ControlCenter } from "./window/control-center";
import { FloatingNotifications } from "./window/floating-notifications";
import { LogoutMenu } from "./window/logout-menu";
import { OSD } from "./window/osd";
import { RunnerWindow } from "./runner";
import Notifications from "./modules/notifications";
import Windows from "./window";


// add new windows here!
export const shellWindows = {
    "bar": Bar,
    "osd": OSD,
    "runner": RunnerWindow,
    "control-center": ControlCenter,
    "center-window": CenterWindow,
    "logout-menu": LogoutMenu,
    "floating-notifications": FloatingNotifications,
    "apps-window": AppsWindow
};

let initialized: boolean = false;

export function initWindows(): void {
    if(initialized)
        return;

    Object.keys(shellWindows).forEach(name => Windows.getDefault().addWindow(
        name, shellWindows[name as keyof typeof shellWindows]
    ));
    initialized = true;

    if(!Windows.getDefault().isOpen("bar"))
        Windows.getDefault().open("bar");

    OSD.init();

    createScopedConnection(Notifications.getDefault(), "notification-added", () => {
        Windows.getDefault().open("floating-notifications");
    });
}
