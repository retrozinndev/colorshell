import { Astal, Gtk, Widget } from "astal/gtk3";

import { Tray } from "../widget/bar/Tray";
import { Workspaces } from "../widget/bar/Workspaces";
import { FocusedClient } from "../widget/bar/FocusedClient";
import { Media } from "../widget/bar/Media";
import { Apps } from "../widget/bar/Apps";
import { Clock } from "../widget/bar/Clock";
import { Status } from "../widget/bar/Status";
import { SpecialWorkspaces } from "../widget/bar/SpecialWorkspaces";
import { Separator, SeparatorProps } from "../widget/Separator";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { bind } from "astal";

export const Bar = (mon: number) => {
    const widgetSpacing = 4;
    return new Widget.Window({
        namespace: "top-bar",
        anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT,
        layer: Astal.Layer.TOP,
        exclusivity: Astal.Exclusivity.EXCLUSIVE,
        heightRequest: 46,
        monitor: mon,
        visible: true,
        canFocus: false,
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
                    spacing: widgetSpacing,
                    children: [
                        Apps(),
                        SpecialWorkspaces(),
                        Separator({
                            alpha: .2,
                            orientation: Gtk.Orientation.HORIZONTAL,
                            margin: 14,
                            visible: bind(AstalHyprland.get_default(), "workspaces").as(wss => 
                                wss.filter(ws => ws.id < 0).length > 0)
                        } as SeparatorProps),
                        Workspaces(),
                        FocusedClient()
                    ]
                } as Widget.BoxProps),
                centerWidget: new Widget.Box({
                    className: "widgets-center",
                    homogeneous: false,
                    spacing: widgetSpacing,
                    halign: Gtk.Align.CENTER,
                    children: [
                        Clock(),
                        Media()
                    ]
                } as Widget.BoxProps),
                endWidget: new Widget.Box({
                    className: "widgets-right",
                    homogeneous: false,
                    spacing: widgetSpacing,
                    halign: Gtk.Align.END,
                    children: [
                        Tray(),
                        Status()
                    ]
                } as Widget.BoxProps)
            } as Widget.CenterBoxProps)
        } as Widget.BoxProps)
    } as Widget.WindowProps);
}
