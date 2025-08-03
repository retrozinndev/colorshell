import { bind, Binding, Variable } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../scripts/volume";
import AstalWp from "gi://AstalWp";
import AstalHyprland from "gi://AstalHyprland";
import { AstalPlayers } from "../scripts/player";
import { getSymbolicIcon } from "../scripts/apps";

export enum OSDModes {
    SINK,
    SOURCE,
    LAYOUT,
    //BRIGHTNESS,
    //CAPSLOCK,
    //NUMLOCK,
    //PLAYER
}

let osdMode: (Variable<OSDModes>|null);
const layoutVar = new Variable("");
let WireplumberObject: object|null;

export function variableHandler(mode: OSDModes, value: any) {
    switch (mode) {
        case OSDModes.LAYOUT:
            if (layoutVar === value) return; 
            layoutVar.set(value.substring(0, 2).toUpperCase());
            break;

        case OSDModes.SINK:
            WireplumberObject = value;
            console.log(`Sink mute status: ${typeof value}`);
            break;

        case OSDModes.SOURCE:
            WireplumberObject = value;
            console.log(`Source mute status: ${typeof value}`);
            break;
    }
}

export function setOSDMode(newMode: OSDModes): void {
    if(!osdMode) return;

    osdMode.set(newMode);
}

function createOSD(
    props: Widget.BoxProps,
    iconName: string | Binding<string>,
    labelOSD?: string | Binding<string>,
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
            new Widget.Label({
                className: "action",
                visible: labelOSD ? true : false,
                label: labelOSD,
            } as Widget.LabelProps),
        ]
    } as Widget.BoxProps)
}

function createOSDSublabel(
    props: Widget.BoxProps,
    iconName: string | Binding<string>,
    labelOSD?: string | Binding<string>,
    sublabelOSD?: string | Binding<string>
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
                vertical: true,
                children: [
                    new Widget.Label({
                        className: "action",
                        visible: labelOSD ? true : false,
                        label: labelOSD,
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "sublabel",
                        visible: sublabelOSD ? true : false,
                        label: sublabelOSD,
                    } as Widget.LabelProps)
                ]
            })
        ]
    } as Widget.BoxProps)
}

function createOSDLevelBar(
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
                                width_request: 140,
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
    return createOSDLevelBar(
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
    return createOSDLevelBar(
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

//need to do more work here
function OSDPlayer() {
    const player = AstalPlayers.getDefault().activePlayer;
    return createOSDSublabel(
        { name: "player" },
        bind(AstalPlayers.getDefault(), "activePlayer").as(activePlayer => getSymbolicIcon(activePlayer.get_entry()) || 
            getSymbolicIcon(activePlayer.get_bus_name().split('.').filter(str => !str.toLowerCase().includes('instance')).join('.')) ||
                "folder-music-symbolic"),
        bind(player, "title").as(title => title ? title : ""),
        bind(player, "artist").as(artist => artist ? artist : (player.get_identity() || ""))
    )
    /*return createOSDLevelBar(
        { name: "player" },
        player,
        bind(AstalPlayers.getDefault(), "activePlayer").as(activePlayer => getSymbolicIcon(activePlayer.get_entry()) ?? 
            getSymbolicIcon(activePlayer.get_bus_name().split('.').filter(str => !str.toLowerCase().includes('instance')).join('.')) ??
                "folder-music-symbolic"),
        bind(player, "title"),
        bind(player, "position"),
        bind(player, "length")
    )*/
}

function OSDLayout() {
    const hyprland = AstalHyprland.get_default();
    return createOSD(
        { name: "layout" },
        "input-keyboard-symbolic",
        bind(layoutVar, "value")
    )
}

export const OSD = (mon: number) => {
    osdMode = new Variable<OSDModes>();

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
            WireplumberObject = null;
        },
        children: bind(osdMode, "value").as((mode: OSDModes) => {
            switch (mode) {
                case OSDModes.SINK: return OSDSink();
                case OSDModes.SOURCE: return OSDSource();
                case OSDModes.LAYOUT: return OSDLayout();
                case OSDModes.PLAYER: return OSDPlayer();
            }
        }),
    } as Widget.WindowProps);
}
