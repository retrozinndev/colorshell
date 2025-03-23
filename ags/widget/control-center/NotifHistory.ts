import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { HistoryNotification, Notifications } from "../../scripts/notifications";
import { NotificationWidget } from "../Notification";


export const NotifHistory: Gtk.Widget = new Widget.Box({
    orientation: Gtk.Orientation.VERTICAL,
    className: "history",
    expand: true,
    visible: bind(Notifications.getDefault(), "history").as(history => history.length > 0),
    children: [
        new Widget.Scrollable({
            className: "history",
            hscroll: Gtk.PolicyType.NEVER,
            vscroll: Gtk.PolicyType.AUTOMATIC,
            expand: true,
            visible: bind(Notifications.getDefault(), "history").as(history => history.length > 0),
            child: new Widget.Box({
                className: "notifications",
                hexpand: true,
                orientation: Gtk.Orientation.VERTICAL,
                homogeneous: false,
                children: bind(Notifications.getDefault(), "history").as((history: Array<HistoryNotification>) =>
                    history.map((notification: HistoryNotification) => NotificationWidget(notification, 
                        () => Notifications.getDefault().removeHistory(notification.id))
                ))
            } as Widget.BoxProps)
        } as Widget.ScrollableProps),
        new Widget.Box({
            vexpand: false,
            hexpand: true,
            halign: Gtk.Align.END,
            className: "button-row",
            children: [
                new Widget.Button({
                    className: "clear-all",
                    child: new Widget.Box({
                        children: [
                            new Widget.Label({
                                className: "nf",
                                css: "margin-right: 6px",
                                label: "󰎟"
                            } as Widget.LabelProps),
                            new Widget.Label({
                                label: "Clear"
                            } as Widget.LabelProps)
                        ]
                    } as Widget.BoxProps),
                    onClick: () => Notifications.getDefault().clearHistory(),
                } as Widget.ButtonProps)
            ]
        })
    ]
} as Widget.BoxProps);
