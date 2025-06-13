import { Astal, Gtk, Widget } from "astal/gtk3";
import { bind } from "astal/binding";
import { Notifications } from "../scripts/notifications";
import { NotificationWidget } from "../widget/Notification";


export const FloatingNotifications = (mon: number) => new Widget.Window({
    namespace: "floating-notifications",
    canFocus: false,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT,
    monitor: mon,
    layer: Astal.Layer.OVERLAY,
    widthRequest: 450,
    exclusivity: Astal.Exclusivity.NORMAL,
    child: new Widget.Box({
        className: "floating-notifications-container",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        spacing: 12,
        visible: bind(Notifications.getDefault(), "notifications").as(notifs => notifs.length > 0),
        children: bind(Notifications.getDefault(), "notifications").as((notifs) => 
            notifs.map((item) => new Widget.Box({
                className: "float-notification",
                child: NotificationWidget(item, 
                    () => Notifications.getDefault().removeNotification(item),
                    false, true)
            } as Widget.BoxProps))
        ),
    } as Widget.BoxProps)
} as Widget.WindowProps);
