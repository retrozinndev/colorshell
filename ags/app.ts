import AstalNotifd from "gi://AstalNotifd";
import AstalHyprland from "gi://AstalHyprland";
import AstalMpris from "gi://AstalMpris";

import { App, Astal } from "astal/gtk3"
import { Wireplumber } from "./scripts/volume";

import { handleArguments } from "./scripts/arg-handler";
import { Time, timeout } from "astal/time";

import { OSDModes, setOSDMode, variableHandler } from "./window/OSD";

import { Runner } from "./runner/Runner";
import { PluginApps } from "./runner/plugins/apps";
import { PluginShell } from "./runner/plugins/shell";
import { PluginWebSearch } from "./runner/plugins/websearch";
import { PluginMedia } from "./runner/plugins/media";
import { Windows } from "./windows";
import { Notifications } from "./scripts/notifications";
import { GObject } from "astal";
import { PluginWallpapers } from "./runner/plugins/wallpapers";
import { Wallpaper } from "./scripts/wallpaper";
import { Stylesheet } from "./scripts/stylesheet";
import { Clipboard } from "./scripts/clipboard";
import { PluginClipboard } from "./runner/plugins/clipboard";
import { Config } from "./scripts/config";
import { AstalPlayers } from "./scripts/player";

const hyprland = AstalHyprland.get_default();
const audio = Wireplumber.getDefault();
const player = AstalPlayers.getDefault();

let osdTimer: (Time|undefined);
let connections = new Map<GObject.Object, (Array<number> | number)>();

const defaultWindows: Array<keyof typeof Windows.windows> = [ "bar" ];
const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch,
    PluginMedia,
    new PluginWallpapers(),
    PluginClipboard
];

App.start({
    instanceName: "astal",
    icons: "icons/",
    requestHandler: (request: string, response: (result: any) => void): void => {
        response(handleArguments(request));
    },
    main: (..._args: Array<string>) => {
        console.log(`Initialized astal instance as: ${ App.instanceName || "astal" }`);


        console.log("Config: initializing configuration file");
        Config.getDefault();

        Stylesheet.getDefault().compileApply();

        App.vfunc_dispose = () => {
            console.log("Disconnecting stuff");
            connections.forEach((v, k) => Array.isArray(v) ? 
                v.map(id => k.disconnect(id))
            : k.disconnect(v));
        };

        // Init clipboard module
        Clipboard.getDefault();

        //OSD Layout
        connections.set(hyprland, [
            hyprland.connect("keyboard-layout", (_, Keyboard, layout) => {
                variableHandler(OSDModes.LAYOUT, layout);
                triggerOSD(OSDModes.LAYOUT);
            })
        ]);
        
        const audioHandler = () => triggerOSD(OSDModes.SINK);
        const sinkHandler = () => triggerOSD(OSDModes.SOURCE);
        //OSD Wireplumber
        connections.set(audio, [
            audio.getDefaultSink().connect("notify::volume", audioHandler),
            audio.getDefaultSink().connect("notify::mute", audioHandler),
            audio.getDefaultSource().connect("notify::volume", sinkHandler),
            audio.getDefaultSource().connect("notify::mute", sinkHandler),
        ]);

        //OSD Player
        /*connections.set(player, [
            AstalPlayers.getDefault().activePlayer.connect("notify::title", () =>           
                triggerOSD(OSDModes.PLAYER)
            ),
            player.activePlayer.connect("notify::playback-status", (s) => {
                if (s.playbackStatus === AstalMpris.PlaybackStatus.PLAYING && 
                    hyprland.get_focused_client().get_fullscreen() === AstalHyprland.Fullscreen.FULLSCREEN &&
                    hyprland.get_focused_client().get_class().toLowerCase() !== player.activePlayer.get_enrty().toLowerCase()) 
                    triggerOSD(OSDModes.PLAYER); 
            })
        ])*/

        connections.set(Notifications.getDefault(), [
            Notifications.getDefault().connect("notification-added", (_, _notif: AstalNotifd.Notification) => {
                Windows.open("floating-notifications");
            }),
            Notifications.getDefault().connect("notification-removed", (_: Notifications, _id: number) => {
                _.notifications.length === 0 && Windows.close("floating-notifications");
            })
        ]);

        console.log("Initializing wallpaper handler");
        Wallpaper.getDefault();

        console.log("Adding runner plugins");
        runnerPlugins.map(plugin => Runner.addPlugin(plugin));

        console.log("Opening default windows");
        // Open openOnStart windows
        defaultWindows.map(name => {
            if(Windows.isVisible(name)) return;
            Windows.open(name);
        });
    }
});

function triggerOSD(osdModeParam: OSDModes) {
    if (Windows.isVisible("control-center")) return;

    Windows.open("osd");
    setOSDMode(osdModeParam);

    if (osdTimer) {
        osdTimer.cancel();
    }

    osdTimer = timeout(3000, () => {
        Windows.close("osd");
        osdTimer = undefined;
    });
}
