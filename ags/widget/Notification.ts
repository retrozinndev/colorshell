import { Astal, Gtk, Widget } from "astal/gtk3";
import AstalNotifd from "gi://AstalNotifd";
import { Separator } from "./Separator";
import Pango from "gi://Pango";

export function getUrgencyString(notif: AstalNotifd.Notification) {
    switch(notif.urgency) {
        case AstalNotifd.Urgency.LOW: 
            return "low";
        case AstalNotifd.Urgency.CRITICAL: 
            return "critical";
    }

    return "normal";
}

export function NotificationWidget(notification: AstalNotifd.Notification|number, 
        onClose?: (notif: AstalNotifd.Notification) => void): Gtk.Widget {

    notification = (notification instanceof AstalNotifd.Notification) ? 
        notification
    : AstalNotifd.get_default().get_notification(notification);

    return new Widget.EventBox({
        onClick: () => {
            if(notification.actions.length >= 1 && notification.actions[0].label.toLowerCase() === "view") {
                notification.invoke(notification.actions[0]!.id);
                onClose && onClose(notification);
            }
        },
        child: new Widget.Box({
            className: `notification ${getUrgencyString(notification)}`,
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
                        new Widget.Icon({
                            className: "icon app-icon",
                            icon: Astal.Icon.lookup_icon(notification.appIcon) ? 
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
                        new Widget.Button({
                            className: "close nf",
                            halign: Gtk.Align.END,
                            onClick: () => onClose && onClose(notification),
                            image: new Widget.Icon({
                                className: "close icon",
                                icon: "window-close-symbolic"
                            } as Widget.IconProps)
                        } as Widget.ButtonProps)
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
                                    wrapMode: Pango.WrapMode.WORD,
                                    label: notification.body.replace(/\&/g, "&amp;")
                                } as Widget.LabelProps)
                            ]
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "actions button-row",
                    hexpand: true,
                    visible: (notification.actions.length === 1 && 
                        notification.actions[0].label.toLowerCase() === "view") 
                            || notification.actions.length === 0 ? false : true,
                    children: notification.actions.map((action: AstalNotifd.Action, i: number) => 
                        new Widget.Button({
                            className: "action",
                            visible: i === 0 ? (action.label.toLowerCase() !== "view") : true,
                            label: action.label,
                            hexpand: true,
                            onClicked: () => {
                                notification.invoke(action.id);
                                onClose && onClose(notification);
                            }
                        } as Widget.ButtonProps)
                    )
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps),
    } as Widget.EventBoxProps);
}
