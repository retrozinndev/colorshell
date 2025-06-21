import { bind, Variable } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../scripts/volume";

export enum OSDModes {
    SINK,
    BRIGHTNESS
}

let osdMode: (Variable<OSDModes>|null);

export function setOSDMode(newMode: OSDModes): void {
    if(!osdMode) return;

    osdMode.set(newMode);
}

export const OSD = (mon: number) => {
    osdMode = new Variable<OSDModes>(OSDModes.SINK);

    return new Widget.Window({
        namespace: "osd",
        className: "osd-window",
        layer: Astal.Layer.OVERLAY,
        anchor: Astal.WindowAnchor.BOTTOM,
        canFocus: false,
        clickThrough: true,
        focusOnClick: false,
        marginBottom: 80,
        monitor: mon,
        onDestroy: () => {
            osdMode?.drop();
            osdMode = null;
        },
        child: new Widget.Box({
            className: "osd",
            expand: true,
            children: [
                new Widget.Icon({
                    className: "icon",
                    icon: bind(Wireplumber.getDefault().getDefaultSink(), "volumeIcon").as(icon => 
                        !Wireplumber.getDefault().isMutedSink() && Wireplumber.getDefault().getSinkVolume() > 0 ? icon : "audio-volume-muted-symbolic"),
                } as Widget.IconProps),
                new Widget.Box({
                    className: "volume",
                    orientation: Gtk.Orientation.VERTICAL,
                    valign: Gtk.Align.CENTER,
                    expand: true,
                    children: [
                        new Widget.Label({
                            className: "device",
                            label: bind(Wireplumber.getDefault().getDefaultSink(), "description").as(description => 
                                description ?? "Speaker"),
                            truncate: true,
                        } as Widget.LabelProps),
                        new Widget.Box({
                            expand: true,
                            child: new Widget.LevelBar({
                                className: "levelbar",
                                value: bind(Wireplumber.getDefault().getDefaultSink(), "volume").as((volume: number) => 
                                    Math.floor(volume * 100)),
                                maxValue: bind(Wireplumber.getWireplumber(), "defaultSpeaker").as(() =>
                                    Wireplumber.getDefault().getMaxSinkVolume()),
                                expand: true
                            } as Widget.LevelBarProps)
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    } as Widget.WindowProps);
}
