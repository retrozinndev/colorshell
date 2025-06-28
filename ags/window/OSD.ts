import { bind, Binding, Variable } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../scripts/volume";
import AstalWp from "gi://AstalWp";

export enum OSDModes {
    SINK,
    SOURCE,
    BRIGHTNESS
}

let osdMode: (Variable<OSDModes>|null);

export function setOSDMode(newMode: OSDModes): void {
    if(!osdMode) return;

    osdMode.set(newMode);
}

function createOSD(
    props: Widget.BoxProps,
    bindable: AstalWp.Endpoint,
    iconName: string | Binding<string>,
    labelOSD: string | Binding<string>,
    valueOSD: number | Binding<number>,
    maxValueOSD: number | Binding<number>

) {
    return new Widget.Box({
        ...props,
        className: `osd ${props.className || ''}`, 
        expand: true,
        children: [
            new Widget.Icon({
                className: "icon",
                icon: iconName,
            } as Widget.IconProps),
            new Widget.Box({
                className: "volume",
                orientation: Gtk.Orientation.VERTICAL,
                valign: Gtk.Align.CENTER,
                children: [
                    new Widget.Label({
                        className: "device",
                        label: labelOSD,
                        truncate: true,
                    } as Widget.LabelProps),
                    new Widget.Box({
                        vexpand: false,
                        expand: false,
                        children: [
                            new Widget.LevelBar({
                                className: "levelbar",
                                width_request: 120,
                                value: valueOSD,
                                maxValue: maxValueOSD,
                                expand: true,
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
}

function OSDSink() {
    const audio = Wireplumber.getDefault().getDefaultSink();
    return createOSD(
        { name: "sink" },
        audio,
        bind(audio, "volumeIcon").as(icon => 
            !Wireplumber.getDefault().isMutedSink() && Wireplumber.getDefault().getSinkVolume() > 0 ? 
                icon : "audio-volume-muted-symbolic"),
        bind(audio, "description").as((description: string) => 
            description || "Speaker"),
        bind(audio, "volume").as((volume: number) => 
            Math.floor(volume * 100)),
        bind(Wireplumber.getWireplumber(), "defaultSpeaker").as(() => 
            Wireplumber.getDefault().getMaxSinkVolume())
    )
}

function OSDSource() {
    const source = Wireplumber.getDefault().getDefaultSource();
    return createOSD(
        { name: "source" },
        source,
        bind(source, "volumeIcon").as(icon => 
            !Wireplumber.getDefault().isMutedSource() && Wireplumber.getDefault().getSourceVolume() > 0 ? 
                icon : "microphone-sensitivity-muted-symbolic"),
        bind(source, "description").as((description: string) => 
            description || "Microphone"),
        bind(source, "volume").as((volume: number) => 
            Math.floor(volume * 100)),
        bind(Wireplumber.getWireplumber(), "defaultMicrophone").as(() =>
            Wireplumber.getDefault().getMaxSourceVolume())
    )
}

export const OSD = (mon: number) => {
    osdMode = new Variable<OSDModes>(OSDModes.SINK);

    return new Widget.Window({
        namespace: "osd",
        className: "osd-window",
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
        },
        child: new Widget.Stack({
            visibleChildName: bind(osdMode, "value").as((mode: OSDModes) => {
                switch (mode) {
                    case OSDModes.SINK: return "sink";
                    case OSDModes.SOURCE: return "source";
                    default: return "sink";
                }
            }),
            onDestroy: () => {
                osdMode = null
            },
            children: [
                OSDSink(),
                OSDSource(),
            ]
        } as Widget.BoxProps)
    } as Widget.WindowProps);
}
