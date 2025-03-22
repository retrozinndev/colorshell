import { Astal, Gtk, Widget } from "astal/gtk3";
import AstalNotifd from "gi://AstalNotifd";
import { bind } from "astal/binding";
import { Notifications } from "../scripts/notifications";
import { NotificationWidget } from "../widget/Notification";

const connections: Array<number> = [];

export const FloatingNotifications: Widget.Window = new Widget.Window({
    namespace: "floating-notifications",
    canFocus: false,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT,
    monitor: 0,
    layer: Astal.Layer.OVERLAY,
    visible: false,
    widthRequest: 450,
    exclusivity: Astal.Exclusivity.NORMAL,
    setup: (window) => {
        connections.push(
            Notifications.getDefault().connect("notification-added", (_, _notif: AstalNotifd.Notification) => {
                !window.is_visible() && window.show();
            }),
            Notifications.getDefault().connect("notification-removed", (_: Notifications, _id: number) => {
                window.is_visible() && _.notifications.length === 0 && window.hide()
                window.isFocus = false;
            })
        );
    },
    onDestroy: () => connections.map(id => Notifications.getDefault().disconnect(id)),
    child: new Widget.Box({
        className: "floating-notifications-container",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        visible: bind(Notifications.getDefault(), "notifications").as(notifs => notifs.length > 0),
        children: bind(Notifications.getDefault(), "notifications").as((notifs) => 
            notifs.map((item) => 
                NotificationWidget(item, 
                    () => Notifications.getDefault().removeNotification(item))
            )
        ),
    } as Widget.BoxProps)
} as Widget.WindowProps);
