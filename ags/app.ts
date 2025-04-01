import { App } from "astal/gtk3"
import { Wireplumber } from "./scripts/volume";

import { runStyleHandler } from "./scripts/style-handler";
import { handleArguments } from "./scripts/arg-handler";
import { Time, timeout } from "astal/time";

import { OSDModes, setOSDMode } from "./window/OSD";

import { Runner } from "./runner/Runner";
import { PluginApps } from "./runner/plugins/apps";
import { PluginShell } from "./runner/plugins/shell";
import { PluginWebSearch } from "./runner/plugins/websearch";
import { PluginMedia } from "./runner/plugins/media";
import { Windows } from "./windows";
import { Notifications } from "./scripts/notifications";
import AstalNotifd from "gi://AstalNotifd";
import { GObject } from "astal";


let osdTimer: (Time|undefined);
let connections = new Map<GObject.Object, (Array<number> | number)>();

const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch,
    PluginMedia
];

App.start({
    instanceName: "astal",
    async requestHandler(request: string, response: (result: any) => void) {
        // console.log(`[LOG] Arguments received: ${request}`);
        response(await handleArguments(request));
    },
    main() {
        console.log(`[LOG] Initialized astal instance as: ${ App.instanceName || "astal" }`);
        App.vfunc_quit = () => {
            console.log("[LOG] Disconnecting stuff");
            connections.forEach((v, k) => Array.isArray(v) ? 
                v.map(id => k.disconnect(id))
            : k.disconnect(v));
        };

        console.log(`[LOG] Running Stylesheet handler`);

        runStyleHandler();

        //console.log(`[LOG] Starting to monitor scripts to automatically reload instance`);
        //monitorPaths(); // Only for debugging purposes(testing new widgets and stuff)

        connections.set(Wireplumber.getDefault(), [
            Wireplumber.getDefault().getDefaultSink().connect("notify::volume", () => 
                !Windows.isVisible("osd") && triggerOSD(OSDModes.SINK))
        ]);

        connections.set(Notifications.getDefault(), [
            Notifications.getDefault().connect("notification-added", (_, _notif: AstalNotifd.Notification) => {
                Windows.open("floating-notifications");
            }),
            Notifications.getDefault().connect("notification-removed", (_: Notifications, _id: number) => {
                _.notifications.length === 0 && Windows.close("floating-notifications");
            })
        ]);

        console.log(`[LOG] Adding runner plugins`);
        runnerPlugins.map(plugin => Runner.addPlugin(plugin));
    }
});

function triggerOSD(osdModeParam: OSDModes) {
    setOSDMode(osdModeParam);

    if(!osdTimer) {
        Windows.open("osd");
        osdTimer = timeout(3000, () => {
            Windows.close("osd");
            osdTimer = undefined;
        });
        return;
    }

    osdTimer.cancel();
    osdTimer = timeout(3000, () => {
        Windows.close("osd");
        osdTimer = undefined;
    });
}
