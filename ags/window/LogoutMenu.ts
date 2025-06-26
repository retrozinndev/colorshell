import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { getDateTime } from "../scripts/time";
import { execAsync, Gio, GLib } from "astal";
import { AskPopup } from "../widget/AskPopup";
import { Windows } from "../windows";
import { Notifications } from "../scripts/notifications";
import AstalNotifd from "gi://AstalNotifd";
import { NightLight } from "../scripts/nightlight";
import { Config } from "../scripts/config";


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
            _.close();
    },
    child: new Widget.EventBox({
        className: "logout-menu",
        onClick: () => Windows.close("logout-menu"),
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
                            className: "poweroff",
                            image: new Widget.Icon({
                                icon: "system-shutdown-symbolic"
                            } as Widget.IconProps),
                            onClick: () => AskPopup({
                                title: "Power Off",
                                text: "Are you sure you want to power off? Unsaved work will be lost.",
                                onAccept: () => {
                                    Config.getDefault().getProperty("night_light.save_on_shutdown", "boolean") && 
                                        NightLight.getDefault().saveData();

                                    execAsync("systemctl poweroff");
                                }
                            })
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "reboot",
                            image: new Widget.Icon({
                                icon: "arrow-circular-top-right-symbolic"
                            } as Widget.IconProps),
                            onClick: () => AskPopup({
                                title: "Reboot",
                                text: "Are you sure you want to Reboot? Unsaved work will be lost.",
                                onAccept: () => {
                                    Config.getDefault().getProperty("night_light.save_on_shutdown", "boolean") && 
                                        NightLight.getDefault().saveData();

                                    execAsync("systemctl reboot");
                                }
                            })
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "suspend",
                            image: new Widget.Icon({
                                icon: "weather-clear-night-symbolic"
                            } as Widget.IconProps),
                            onClick: () => AskPopup({
                                title: "Suspend",
                                text: "Are you sure you want to Suspend?",
                                onAccept: () => execAsync("systemctl suspend")
                            })
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "logout",
                            image: new Widget.Icon({
                                icon: "system-log-out-symbolic"
                            } as Widget.IconProps),
                            onClick: () => AskPopup({
                                title: "Log out",
                                text: "Are you sure you want to log out? Your session will be ended.",
                                onAccept: () => {
                                    Config.getDefault().getProperty("night_light.save_on_shutdown", "boolean") && 
                                        NightLight.getDefault().saveData();

                                    execAsync(`hyprctl dispatch exit`).catch((err: Gio.IOErrorEnum) => 
                                        Notifications.getDefault().sendNotification({
                                            appName: "colorshell",
                                            summary: "Couldn't exit Hyprland",
                                            body: `An error occurred and colorshell couldn't exit Hyprland. Stderr: \n${
                                                err.message ? `${err.message}\n` : ""}${err.stack}`,
                                            urgency: AstalNotifd.Urgency.NORMAL,
                                            actions: [{
                                                text: "Report Issue on colorshell",
                                                onAction: () => execAsync(
                                                    `xdg-open https://github.com/retrozinndev/colorshell/issues/new`
                                                ).catch((err: Gio.IOErrorEnum) => 
                                                    Notifications.getDefault().sendNotification({
                                                        appName: "colorshell",
                                                        summary: "Couldn't open link",
                                                        body: `Do you have \`xdg-utils\` installed? Stderr: \n${
                                                            err.message ? `${err.message}\n` : ""}${err.stack}`
                                                    })
                                                )
                                            }]
                                        })
                                    )
                                }
                            })
                        } as Widget.ButtonProps),
                    ]
                } as Widget.BoxProps)
            ]
        })
    } as Widget.EventBoxProps)
} as Widget.WindowProps);
