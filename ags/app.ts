import AstalNotifd from "gi://AstalNotifd";

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
import { GObject } from "astal";


let osdTimer: (Time|undefined);
let connections = new Map<GObject.Object, (Array<number> | number)>();

const defaultWindows: Array<keyof typeof Windows.windows> = [ "bar" ];
const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch,
    PluginMedia
];

App.start({
    instanceName: "astal",
    requestHandler: (request: string, response: (result: any) => void): void => {
        response(handleArguments(request));
    },
    main: (..._args: Array<string>) => {
        console.log(`[LOG] Initialized astal instance as: ${ App.instanceName || "astal" }`);

        App.vfunc_dispose = () => {
            console.log("[LOG] Disconnecting stuff");
            connections.forEach((v, k) => Array.isArray(v) ? 
                v.map(id => k.disconnect(id))
            : k.disconnect(v));
        };


        console.log("[LOG] Running Stylesheet handler");

        runStyleHandler();

        //console.log(`[LOG] Starting to monitor scripts to automatically reload instance`);
        //monitorPaths(); // Only for debugging purposes(testing new widgets and stuff)

        connections.set(Wireplumber.getDefault(), [
            Wireplumber.getDefault().getDefaultSink().connect("notify::volume", () => 
                !Windows.isVisible("control-center") && triggerOSD(OSDModes.SINK))
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

        console.log("[LOG] Opening default windows");
        // Open openOnStart windows
        defaultWindows.map(name => {
            if(Windows.isVisible(name)) return;
            Windows.open(name);
        });
    }
});

function triggerOSD(osdModeParam: OSDModes) {
    Windows.open("osd");

    if(!osdTimer) {
        setOSDMode(osdModeParam);
        osdTimer = timeout(3000, () => {
            osdTimer = undefined;
            Windows.close("osd");
        });

        return;
    }

    osdTimer.cancel();
    osdTimer = timeout(3000, () => {
        Windows.close("osd");
        osdTimer = undefined;
    });
}
