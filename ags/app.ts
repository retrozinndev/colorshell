import { App } from "astal/gtk3"
import { Windows } from "./windows";
import { Wireplumber } from "./scripts/volume";

import { runStyleHandler } from "./scripts/style-handler";
import { handleArguments } from "./scripts/arg-handler";
import { Time, timeout } from "astal/time";

import { OSD, OSDModes, setOSDMode } from "./window/OSD";
import { ControlCenter } from "./window/ControlCenter";

import { Runner } from "./runner/Runner";
import { PluginApps } from "./runner/plugins/apps";
import { PluginShell } from "./runner/plugins/shell";
import { PluginWebSearch } from "./runner/plugins/websearch";


let osdTimer: (Time|undefined);

const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch
];

App.start({
    instanceName: "astal",
    requestHandler(request: string, response: (result: any) => void) {
        console.log(`[LOG] Arguments received: ${request}`);
        response(handleArguments(request));
    },
    main() {
        console.log(`[LOG] Initialized astal instance as: ${ App.instanceName || "astal" }`);
        console.log(`[LOG] Running Stylesheet handler`);
        runStyleHandler();
        //console.log(`[LOG] Starting to monitor scripts to automatically reload instance`);
        //monitorPaths(); // Only for debugging purposes(testing new widgets and stuff)

        Wireplumber.getDefault().getDefaultSink().connect("notify::volume", () => 
            !Windows.isVisible(ControlCenter) && triggerOSD(OSDModes.SINK));

        console.log(`[LOG] Adding runner plugins`);
        runnerPlugins.map(plugin => Runner.addPlugin(plugin));
    }
});

function triggerOSD(osdModeParam: OSDModes) {
    setOSDMode(osdModeParam);

    Windows.open(OSD);
    if(!osdTimer) {
        osdTimer = timeout(3000, () => {
            Windows.close(OSD);
            osdTimer = undefined;
        });
    } else {
        osdTimer.cancel();
        osdTimer = timeout(3000, () => {
            Windows.close(OSD);
            osdTimer = undefined;
        });
    }
}
