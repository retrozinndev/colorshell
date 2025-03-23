import { Astal, Gtk, Widget } from "astal/gtk3";
import AstalNotifd from "gi://AstalNotifd";
import { Separator } from "./Separator";
import { HistoryNotification } from "../scripts/notifications";
import { GLib } from "astal";

export function getUrgencyString(notif: AstalNotifd.Notification) {
    switch(notif.urgency) {
        case AstalNotifd.Urgency.LOW: 
            return "low";
        case AstalNotifd.Urgency.CRITICAL: 
            return "critical";
    }

    return "normal";
}

export function NotificationWidget(notification: AstalNotifd.Notification|number|HistoryNotification, 
        onClose?: (notif: AstalNotifd.Notification|HistoryNotification) => void,
        showTime?: boolean /* It's showTime :speaking_head: :boom: :bangbang: */): Gtk.Widget {

    notification = (typeof notification === "number") ? 
        AstalNotifd.get_default().get_notification(notification)
    : notification;

    return new Widget.EventBox({
        onClick: () => {
            if(notification instanceof AstalNotifd.Notification) {
                const viewAction = notification.actions.filter(action => action.label.toLowerCase() === "view")?.[0];
                if(viewAction) notification.invoke(viewAction.id);
            }

            onClose && onClose(notification);
        },
        hexpand: true,
        vexpand: false,
        child: new Widget.Box({
            className: `notification ${ (notification instanceof AstalNotifd.Notification) ? getUrgencyString(notification) : "" }`,
            homogeneous: false,
            expand: true,
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.Box({
                    className: "top",
                    orientation: Gtk.Orientation.HORIZONTAL,
                    hexpand: true,
                    vexpand: false,
                    children: [
                        new Widget.Icon({
                            className: "icon app-icon",
                            icon: (notification instanceof AstalNotifd.Notification) && Astal.Icon.lookup_icon(notification.appIcon) ? 
                                notification.appIcon
                            : (Astal.Icon.lookup_icon(notification.appName.toLowerCase()) ?
                               notification.appName.toLowerCase()
                            : "image-missing"
                            ),
                            setup: (_) => _.get_icon() === "image-missing" &&
                                _.set_visible(false),
                            halign: Gtk.Align.START,
                            css: "font-size: 16px;"
                        }),
                        new Widget.Label({
                            className: "app-name",
                            halign: Gtk.Align.START,
                            hexpand: true,
                            label: notification.appName || "Unknown Application"
                        } as Widget.LabelProps),
                        new Widget.Box({
                            halign: Gtk.Align.END,
                            children: [
                                new Widget.Label({
                                    xalign: 1,
                                    visible: !showTime ? false : true,
                                    className: "time",
                                    label: GLib.DateTime.new_from_unix_utc(notification.time).format("%H:%M"),
                                } as Widget.LabelProps),
                                new Widget.Button({
                                    className: "close nf",
                                    onClick: () => onClose && onClose(notification),
                                    image: new Widget.Icon({
                                        className: "close icon",
                                        icon: "window-close-symbolic"
                                    } as Widget.IconProps)
                                } as Widget.ButtonProps)
                            ]
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps),
                Separator({
                    orientation: Gtk.Orientation.VERTICAL,
                    alpha: 10
                }),
                new Widget.Box({
                    className: "content",
                    orientation: Gtk.Orientation.HORIZONTAL,
                    children: [
                        new Widget.Box({
                            className: "image",
                            visible: Boolean(notification.image),
                            css: `box.image { background-image: url('${notification.image}'); }`
                        } as Widget.BoxProps),
                        new Widget.Box({
                            className: "text",
                            orientation: Gtk.Orientation.VERTICAL,
                            expand: true,
                            children: [
                                new Widget.Label({
                                    className: "summary",
                                    useMarkup: true,
                                    xalign: 0,
                                    truncate: true,
                                    label: notification.summary.replace(/\&/g, "&amp;")
                                }),
                                new Widget.Label({
                                    className: "body",
                                    useMarkup: true,
                                    halign: Gtk.Align.START,
                                    xalign: 0,
                                    truncate: false,
                                    wrap: true,
                                    label: notification.body.replace(/\&/g, "&amp;")
                                } as Widget.LabelProps)
                            ]
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "actions button-row",
                    hexpand: true,
                    visible: (notification instanceof AstalNotifd.Notification) ?
                        (notification.actions.filter(action => action.label.toLowerCase() !== "view").length > 0)
                    : false,
                    children: (notification instanceof AstalNotifd.Notification) ? 
                        notification.actions.filter(action => action.label.toLowerCase() !== "view")
                        .map((action: AstalNotifd.Action) => 
                            new Widget.Button({
                                className: "action",
                                label: action.label,
                                hexpand: true,
                                onClicked: () => {
                                    notification.invoke(action.id);
                                    onClose && onClose(notification);
                                }
                            } as Widget.ButtonProps)
                        )
                    : []
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps),
    } as Widget.EventBoxProps);
}
