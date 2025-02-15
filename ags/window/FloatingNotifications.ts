import { Astal, Gtk, Widget } from "astal/gtk3";
import AstalNotifd from "gi://AstalNotifd";
import { bind } from "astal";
import { Notifications } from "../scripts/notification-handler";

function NotificationWidget(notification: AstalNotifd.Notification): Gtk.Widget {
    return new Widget.Box({
        className: "notification",
        homogeneous: false,
        expand: false,
        orientation: Gtk.Orientation.VERTICAL,
        children: [
            new Widget.Box({
                className: "top",
                orientation: Gtk.Orientation.HORIZONTAL,
                hexpand: true,
                vexpand: false,
                children: [
                    new Widget.Label({
                        className: "app-name",
                        halign: Gtk.Align.START,
                        label: notification.appName || "Unknown Application"
                    } as Widget.LabelProps),
                    new Widget.Button({
                        className: "close-button",
                        onClick: () => Notifications.removeNotification(notification.id)
                    } as Widget.ButtonProps)
                ]
            } as Widget.BoxProps),
            new Widget.Box({
                className: "content",
                orientation: Gtk.Orientation.HORIZONTAL,
                children: [
                    new Widget.Box({
                        className: "image",
                        visible: notification.image !== "",
                        css: `box.image { background-image: url('${notification.image}'); }`
                    } as Widget.BoxProps),
                    new Widget.Box({
                        className: "text",
                        orientation: Gtk.Orientation.VERTICAL,
                        children: [
                            new Widget.Label({
                                className: "summary",
                                useMarkup: true,
                                label: notification.summary
                            }),
                            new Widget.Label({
                                className: "body",
                                useMarkup: true,
                                label: notification.body
                            } as Widget.LabelProps)
                        ]
                    } as Widget.BoxProps)
                ]
            } as Widget.BoxProps)
        ]
    } as Widget.BoxProps);
}

export const FloatingNotifications: Widget.Window = new Widget.Window({
    namespace: "floating-notifications",
    canFocus: false,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT,
    monitor: 0,
    layer: Astal.Layer.OVERLAY,
    visible: false,
    width_request: 350,
    exclusivity: Astal.Exclusivity.NORMAL,
    child: new Widget.Box({
        className: "floating-notifications-container",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        children: bind(Notifications, "notifications").as((notifications: Array<AstalNotifd.Notification>) =>
            notifications.map((notification: AstalNotifd.Notification) => 
                NotificationWidget(notification)))
    } as Widget.BoxProps)
} as Widget.WindowProps);
