import { Astal, Gtk, Widget } from "astal/gtk3";
import AstalNotifd from "gi://AstalNotifd";
import { Separator } from "./Separator";
import { HistoryNotification, Notifications } from "../scripts/notifications";
import { GLib } from "astal";
import { getAppIcon } from "../scripts/apps";


function getNotificationImage(notif: AstalNotifd.Notification|HistoryNotification): (string|undefined) {
    const img = notif.image ?? notif.appIcon;
    if(!img) return undefined;

    if(!img.includes('/')) return undefined;

    if(img.startsWith('/')) 
        return `file://${img}`;

    if(img.startsWith('~') || img.startsWith("file://~"))
        return `file://${GLib.get_home_dir()}/${img.replace(/^(file\:\/\/|\~|file\:\/\/~)/g, "")}`;

    return img;
}

export function NotificationWidget(notification: AstalNotifd.Notification|number|HistoryNotification, 
        onClose?: (notif: AstalNotifd.Notification|HistoryNotification) => void,
        showTime?: boolean /* It's showTime :speaking_head: :boom: :bangbang: */,
        holdOnHover?: boolean): Gtk.Widget {

    notification = (typeof notification === "number") ? 
        AstalNotifd.get_default().get_notification(notification)
    : notification;

    const body: string = notification.body.split(' ').map(strPart => {
        if(/^\<(.*)\>/.test(strPart) || /<\/(.*)\>$/.test(strPart)) 
            return strPart;

        return strPart.length >= 25 ? `${strPart.substring(0, 22)}...`
        : strPart
    }).join(' ');

    return new Widget.EventBox({
        onClick: () => {
            if(notification instanceof AstalNotifd.Notification) {
                const viewAction = notification.actions.filter(action => 
                    action.label.toLowerCase() === "view")?.[0];

                viewAction && notification.invoke(viewAction.id);
            }

            onClose?.(notification);
        },
        onHover: () => holdOnHover && Notifications.getDefault().holdNotification(notification.id),
        onHoverLost: () => holdOnHover && onClose?.(notification),
        hexpand: true,
        vexpand: false,
        child: new Widget.Box({
            className: `notification ${ (notification instanceof AstalNotifd.Notification) ? 
                Notifications.getDefault().getUrgencyString(notification.urgency) : "" }`,
            homogeneous: false,
            expand: true,
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            children: [
                new Widget.Box({
                    className: "top",
                    orientation: Gtk.Orientation.HORIZONTAL,
                    hexpand: true,
                    vexpand: false,
                    children: [
                        new Widget.Icon({
                            className: "icon app-icon",
                            icon: notification.appIcon && Astal.Icon.lookup_icon(notification.appIcon) ? 
                                notification.appIcon
                            : getAppIcon(notification.appName),
                            setup: (self) => self.set_visible(Boolean(self.get_icon())),
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
                                    label: GLib.DateTime.new_from_unix_local(notification.time).format("%H:%M"),
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
                            setup: (box) => {
                                const img = getNotificationImage(notification);

                                box.set_visible(Boolean(img));
                                img && box.set_css(`background-image: image(url("${img}"))`);
                            }
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
                                    label: body.replace(/\&/g, "&amp;")
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
