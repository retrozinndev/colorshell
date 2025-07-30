import { Wireplumber } from "./scripts/volume";
import { handleArguments } from "./scripts/arg-handler";
import { Time, timeout } from "ags/time";
import { Runner } from "./runner/Runner";
import { PluginApps } from "./runner/plugins/apps";
import { PluginShell } from "./runner/plugins/shell";
import { PluginWebSearch } from "./runner/plugins/websearch";
import { PluginMedia } from "./runner/plugins/media";
import { Windows } from "./windows";
import { Notifications } from "./scripts/notifications";
import { PluginWallpapers } from "./runner/plugins/wallpapers";
import { Wallpaper } from "./scripts/wallpaper";
import { Stylesheet } from "./scripts/stylesheet";
import { Clipboard } from "./scripts/clipboard";
import { PluginClipboard } from "./runner/plugins/clipboard";
import { Config } from "./scripts/config";
import { Scope } from "/usr/share/ags/js/gnim/src/jsx/scope";

import App from "ags/gtk4/app"
import GObject from "ags/gobject";
import AstalNotifd from "gi://AstalNotifd";

export const appScope: Scope = new Scope(null);

let osdTimer: (Time|undefined), osdTimeout = 3500;
let connections = new Map<GObject.Object, (Array<number> | number)>();

const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch,
    PluginMedia,
    PluginWallpapers,
    PluginClipboard
];

const defaultWindows: Array<string> = [ "bar" ];

App.start({
    instanceName: "astal",
    icons: "icons/",
    requestHandler: (request: string, response: (result: any) => void): void => {
        response(handleArguments(request));
    },
    main: (..._args: Array<string>) => {
        console.log(`Colorshell: initialized instance as: "${ App.instanceName || "astal" }"`);
        connections.set(App, App.connect("shutdown", () => appScope.dispose()));

        console.log("Config: initializing configuration file");
        Config.getDefault();

        Stylesheet.getDefault().compileApply();

        // Init clipboard module
        Clipboard.getDefault();

        console.log("Initializing wallpaper handler");
        Wallpaper.getDefault();

        console.log("Adding runner plugins");
        runnerPlugins.forEach(plugin => Runner.addPlugin(plugin));

        connections.set(Wireplumber.getDefault(), 
            Wireplumber.getDefault().getDefaultSink().connect("notify::volume", () => 
                triggerOSD())
        );

        connections.set(Notifications.getDefault(), [
            Notifications.getDefault().connect("notification-added", (_, _notif: AstalNotifd.Notification) => {
                Windows.getDefault().open("floating-notifications");
            }),
            Notifications.getDefault().connect("notification-removed", (_: Notifications, _id: number) => {
                _.notifications.length === 0 && Windows.getDefault().close("floating-notifications");
            })
        ]);

        defaultWindows.forEach(w => Windows.getDefault().open(w));

        appScope.onCleanup(() => {
            console.log("Colorshell: disconnecting from GObjects because of ::shutdown");
            connections.forEach((ids, obj) => Array.isArray(ids) ?
                ids.forEach(id => obj.disconnect(id))
            : obj.disconnect(ids));
        });
    }
});

function triggerOSD() {
    if(Windows.getDefault().isOpen("control-center")) return;

    Windows.getDefault().open("osd");

    if(!osdTimer) {
        osdTimer = timeout(osdTimeout, () => {
            osdTimer = undefined;
            Windows.getDefault().close("osd");
        });

        return;
    }

    osdTimer.cancel();
    osdTimer = timeout(osdTimeout, () => {
        Windows.getDefault().close("osd");
        osdTimer = undefined;
    });
}
