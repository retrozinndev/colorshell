import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalNotifd from "gi://AstalNotifd";
import { Notifications } from "../../scripts/notifications";
import { NotificationWidget } from "../Notification";

export const NotifHistory: Gtk.Widget = new Widget.Scrollable({
    hscroll: Gtk.PolicyType.NEVER,
    vscroll: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
    hexpand: true,
    child: new Widget.Box({
        className: "notifications",
        children: bind(Notifications.getDefault(), "history").as((history: Array<AstalNotifd.Notification>) =>
            history.map((notification: AstalNotifd.Notification) => NotificationWidget(notification, 
                () => Notifications.getDefault().removeHistory(notification.id))
        ))
    } as Widget.BoxProps)
} as Widget.ScrollableProps)
