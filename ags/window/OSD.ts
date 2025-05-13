import { bind, Binding, Variable } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../scripts/volume";

export enum OSDModes {
    SINK,
    BRIGHTNESS
}

let osdMode: (Variable<OSDModes>|null);
let osdIcon: (Binding<string | undefined>|null);

export function setOSDMode(newMode: OSDModes): void {
    if(!osdMode) return;

    osdMode.set(newMode);
}

export const OSD = (mon: number) => {
    osdMode = new Variable<OSDModes>(OSDModes.SINK);
    osdIcon = osdMode().as((mode: OSDModes) => {
        switch(mode) {
            case OSDModes.SINK: return "󰕾";
            case OSDModes.BRIGHTNESS: return "󰃠";
            default: return "󱧣";
        }
    });

    return new Widget.Window({
        namespace: "osd",
        layer: Astal.Layer.OVERLAY,
        anchor: Astal.WindowAnchor.BOTTOM,
        canFocus: false,
        marginBottom: 80,
        focusOnClick: false,
        clickThrough: true,
        monitor: mon,
        onDestroy: () => {
            osdMode?.drop();

            osdMode = null;
            osdIcon = null;
        },
        child: new Widget.Box({
            className: "osd",
            children: [
                new Widget.Label({
                    className: "icon",
                    label: osdIcon
                } as Widget.LabelProps),
                new Widget.Box({
                    className: "volume",
                    orientation: Gtk.Orientation.VERTICAL,
                    valign: Gtk.Align.CENTER,
                    children: [
                        new Widget.Label({
                            className: "device",
                            label: bind(Wireplumber.getDefault().getDefaultSink(), "name").as((name: string) => 
                                name || "Speaker"),
                            halign: Gtk.Align.CENTER
                        } as Widget.LabelProps),
                        new Widget.Box({
                            vexpand: false,
                            expand: false,
                            children: [
                                new Widget.LevelBar({
                                    className: "levelbar",
                                    width_request: 120,
                                    value: bind(Wireplumber.getDefault().getDefaultSink(), "volume").as((volume: number) => 
                                        Math.floor(volume * 100)),
                                    maxValue: bind(Wireplumber.getWireplumber(), "defaultSpeaker").as(() =>
                                        Wireplumber.getDefault().getMaxSinkVolume()),
                                    vexpand: false,
                                    expand: false,
                                    halign: Gtk.Align.CENTER
                                } as Widget.LevelBarProps),
                                /*new Widget.Label({
                                    className: "value",
                                    label: bind(Wireplumber.getDefault().getDefaultSink(), "volume").as((volume: number) => 
                                        `${Math.floor(volume * 100)}%`),
                                    vexpand: false,
                                    expand: false,
                                    halign: Gtk.Align.CENTER
                                } as Widget.LabelProps)*/
                            ]
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    } as Widget.WindowProps);
}
