import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { getDateTime } from "../scripts/time";
import { execAsync, GLib } from "astal";
import { AskPopup } from "../widget/AskPopup";


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export const LogoutMenu = (mon: number) => new Widget.Window({
    namespace: "logout-menu",
    anchor: TOP | LEFT | RIGHT | BOTTOM,
    layer: Astal.Layer.OVERLAY,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.EXCLUSIVE,
    monitor: mon,
    onKeyPressEvent: (_, event: Gdk.Event) => {
        event.get_keyval()[1] === Gdk.KEY_Escape &&
            _.hide();
    },
    child: new Widget.EventBox({
        className: "logout-menu",
        onClick: () => execAsync("astal close logout-menu"),
        child: new Widget.Box({
            expand: true,
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.Box({
                    className: "top",
                    hexpand: true,
                    vexpand: false,
                    orientation: Gtk.Orientation.VERTICAL,
                    valign: Gtk.Align.START,
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
                    vexpand: true,
                    valign: Gtk.Align.CENTER,
                    height_request: 360,
                    children: [
                        new Widget.Button({
                            className: "poweroff nf",
                            label: "󰐥",
                            onClick: () => AskPopup({
                                title: "Power Off",
                                text: "Are you sure you want to power off? Unsaved work will be lost.",
                                onAccept: () => execAsync("systemctl poweroff")
                            })
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "reboot nf",
                            label: "󰜉",
                            onClick: () => AskPopup({
                                title: "Reboot",
                                text: "Are you sure you want to Reboot? Unsaved work will be lost.",
                                onAccept: () => execAsync("systemctl reboot")
                            })
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "suspend nf",
                            label: "󰤄",
                            onClick: () => AskPopup({
                                title: "Suspend",
                                text: "Are you sure you want to Suspend?",
                                onAccept: () => execAsync("systemctl suspend")
                            })
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "logout nf",
                            label: "󰗽",
                            onClick: () => AskPopup({
                                title: "Log out",
                                text: "Are you sure you want to log out? Your session will be ended.",
                                onAccept: () => execAsync(`sh -c "loginctl terminate-user ${GLib.getenv("USER") || "$USER"}"`)
                            })
                        } as Widget.ButtonProps),
                    ]
                } as Widget.BoxProps)
            ]
        })
    } as Widget.EventBoxProps)
} as Widget.WindowProps);
