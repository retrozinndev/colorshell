import { Astal, Gtk } from "ags/gtk4";
import { createBinding, createState } from "ags";
import { Wireplumber } from "../modules/volume";
import { Windows } from "../windows";
import { Time, timeout } from "ags/time";

import Pango from "gi://Pango?version=1.0";


export enum OSDModes {
    SINK,
    BRIGHTNESS,
    NONE
}

const [osdMode, setOSDMode] = createState(OSDModes.NONE);
let osdTimer: (Time|undefined), osdTimeout = 3500;

export const OSD = (mon: number) => {
    if(osdMode.get() === OSDModes.NONE)
        setOSDMode(OSDModes.SINK);

    return <Astal.Window namespace={"osd"} class={"osd-window"} layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM} focusable={false} marginBottom={80} monitor={mon}>

        <Gtk.Box class={"osd"}>
            <Gtk.Image class={"icon"} iconName={createBinding(Wireplumber.getDefault().getDefaultSink(), 
                  "volumeIcon").as(icon => !Wireplumber.getDefault().isMutedSink() && 
                      Wireplumber.getDefault().getSinkVolume() > 0 ? icon : "audio-volume-muted-symbolic")}
            />
            <Gtk.Box orientation={Gtk.Orientation.VERTICAL} class={"volume"} vexpand={true} hexpand={true}>
                <Gtk.Label class={"device"} label={createBinding(Wireplumber.getDefault().getDefaultSink(), 
                      "description").as(description => description ?? "Speaker")}
                  ellipsize={Pango.EllipsizeMode.END}
                />
                <Gtk.LevelBar class={"levelbar"} value={createBinding(
                      Wireplumber.getDefault().getDefaultSink(), "volume")} 
                  maxValue={Wireplumber.getDefault().getMaxSinkVolume() / 100}
                />
            </Gtk.Box>
        </Gtk.Box>
    </Astal.Window>
}

export function triggerOSD() {
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
