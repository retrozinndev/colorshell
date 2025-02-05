import { Gdk, Astal, Gtk, Widget } from "astal/gtk3";

import { Clock } from "../widget/bar/Clock";
import { Logo } from "../widget/bar/Logo";
import { Tray } from "../widget/bar/Tray";
import { Workspaces } from "../widget/bar/Workspaces";
import { Audio } from "../widget/bar/Audio";
import { FocusedClient } from "../widget/bar/FocusedClient";
import { Media } from "../widget/bar/Media";

export const Bar: Widget.Window = new Widget.Window({
    className: "bar",
    monitor: 0,
    namespace: "top-bar",
    anchor: Astal.WindowAnchor.TOP,
    layer: Astal.Layer.TOP,
    exclusivity: Astal.Exclusivity.EXCLUSIVE,
    canFocus: false,
    visible: true,
    widthRequest: Gdk.Screen.get_default()?.get_monitor_geometry(0)?.width,
    hexpand: false,
    vexpand: false,
    child: new Widget.Box({
        className: "bar-container",
        child: new Widget.CenterBox({
            className: "bar-centerbox",
            expand: true,
            homogeneous: false,
            startWidget: new Widget.Box({
                className: "widgets-left",
                homogeneous: false,
                halign: Gtk.Align.START,
                children: [
                    Logo(),
                    Workspaces(),
                    FocusedClient()
                ]
            } as Widget.BoxProps),
            centerWidget: new Widget.Box({
                className: "widgets-center",
                homogeneous: false,
                halign: Gtk.Align.CENTER,
                children: [
                    Clock(),
                    Media()
                ]
            } as Widget.BoxProps),
            endWidget: new Widget.Box({
                className: "widgets-right",
                homogeneous: false,
                halign: Gtk.Align.END,
                children: [
                    Tray(),
                    Audio()
                ]
            } as Widget.BoxProps)
        } as Widget.CenterBoxProps)
    } as Widget.BoxProps)
} as Widget.WindowProps);
