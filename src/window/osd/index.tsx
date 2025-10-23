import { Astal, Gtk } from "ags/gtk4";
import { createBinding, createState, With } from "ags";
import { Wireplumber } from "../../modules/volume";
import { Windows } from "../../windows";
import { Backlights } from "../../modules/backlight";
import { secureBaseBinding, variableToBoolean } from "../../modules/utils";

import Pango from "gi://Pango?version=1.0";
import GLib from "gi://GLib?version=2.0";
import AstalWp from "gi://AstalWp?version=0.1";
import OSDMode from "./modules/osdmode";


export const OSDModes = {
    sink: new OSDMode({
        available: createBinding(AstalWp.get_default(), "defaultSpeaker").as((sink) => 
            Boolean(sink)),
        icon: secureBaseBinding<AstalWp.Endpoint>(
            createBinding(AstalWp.get_default(), "defaultSpeaker"),
            "volumeIcon",
            "audio-volume-high-symbolic"
        ),
        value: secureBaseBinding<AstalWp.Endpoint>(
            createBinding(AstalWp.get_default(), "defaultSpeaker"),
            "volume",
            .5
        ),
        text: secureBaseBinding<AstalWp.Endpoint>(
            createBinding(AstalWp.get_default(), "defaultSpeaker"),
            "description",
            "Unknown Speaker"
        ),
        max: Wireplumber.getDefault().getMaxSinkVolume() / 100
    }),
    brightness: new OSDMode({
        icon: "display-brightness-symbolic",
        value: secureBaseBinding<Backlights.Backlight>(
            createBinding(Backlights.getDefault(), "default"), 
            "brightness", 
            100
        ),
        max: secureBaseBinding<Backlights.Backlight>(
            createBinding(Backlights.getDefault(), "default"), 
            "maxBrightness", 
            100
        ),
        text: secureBaseBinding<Backlights.Backlight>(
            createBinding(Backlights.getDefault(), "default"), 
            "name", 
            "Unknown Backlight"
        ),
        available: createBinding(Backlights.getDefault(), "available")
    })
}

const [osdMode, setOSDMode] = createState(OSDModes.sink);
let osdTimer: (GLib.Source|undefined), osdTimeout = 3500;

export const OSD = (mon: number) => 
    <Astal.Window namespace={"osd"} class={"osd-window"} layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM} focusable={false} marginBottom={80} monitor={mon}>

        <Gtk.Box class={"osd"}>
            <With value={osdMode}>
                {(mode: OSDMode) => {
                    if(!mode.available) return;

                    return <Gtk.Box>
                        <Gtk.Image class={"icon"} iconName={
                            createBinding(mode, "icon")
                        } />
                        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} class={"level"} vexpand hexpand>
                            <Gtk.Label class={"text"} label={createBinding(mode, "text").as(t => t ?? "")}
                              ellipsize={Pango.EllipsizeMode.END}
                              visible={variableToBoolean(createBinding(mode, "text"))}
                            />
                            <Gtk.LevelBar value={createBinding(mode, "value")} hexpand
                              maxValue={createBinding(mode, "max")}
                            />
                        </Gtk.Box>
                    </Gtk.Box>;
                }}
            </With>
        </Gtk.Box>
    </Astal.Window>;

export function triggerOSD(mode: OSDMode) {
    setOSDMode(mode);
    Windows.getDefault().open("osd");

    if(!osdTimer) {
        osdTimer = setTimeout(() => {
            osdTimer = undefined;
            Windows.getDefault().close("osd");
        }, osdTimeout);

        return;
    }

    osdTimer.destroy();
    osdTimer = setTimeout(() => {
        Windows.getDefault().close("osd");
        osdTimer = undefined;
    }, osdTimeout);
}
