import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { getDateTime } from "../scripts/time";
import { execAsync, GLib, Process } from "astal";


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export const LogoutMenu: Widget.Window = new Widget.Window({
    namespace: "logout-menu",
    anchor: TOP | LEFT | RIGHT | BOTTOM,
    layer: Astal.Layer.OVERLAY,
    exclusivity: Astal.Exclusivity.IGNORE,
    monitor: 0,
    visible: false,
    child: new Widget.EventBox({
        className: "logout-menu",
        onClick: () => Process.exec_async("astal close logout-menu", () => {}),
        child: new Widget.Box({
            homogeneous: false,
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.Box({
                    className: "top",
                    expand: true,
                    orientation: Gtk.Orientation.VERTICAL,
                    children: [
                        new Widget.Label({
                            className: "time",
                            label: getDateTime().as((dateTime: GLib.DateTime) => 
                                dateTime.format("%H:%M"))
                        } as Widget.LabelProps),
                        new Widget.Label({
                            className: "date",
                            label: getDateTime().as((dateTime: GLib.DateTime) => 
                                dateTime.format("%A, %B %d %Y"))
                        } as Widget.LabelProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "button-row",
                    homogeneous: true,
                    expand: true,
                    valign: Gtk.Align.CENTER,
                    children: [
                        new Widget.Button({
                            className: "poweroff nf",
                            label: "󰐥",
                            onClick: "ask user if it's fr!"
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "reboot nf",
                            label: "󰜉",
                            onClick: "ask user if it's fr!"
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "suspend nf",
                            label: "󰤄",
                            onClick: "ask user if it's fr!"
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "logout nf",
                            label: "󰗽",
                            onClick: () => execAsync("astal close logout-menu && bash -c 'loginctl terminate-user $USER'")
                        } as Widget.ButtonProps),
                    ]
                } as Widget.BoxProps)
            ]
        })
    } as Widget.EventBoxProps)
} as Widget.WindowProps);
