import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { HistoryNotification, Notifications } from "../../scripts/notifications";
import { NotificationWidget } from "../Notification";
import { tr } from "../../i18n/intl";


export const NotifHistory = () => {
    return new Widget.Box({
        orientation: Gtk.Orientation.VERTICAL,
        className: bind(Notifications.getDefault(), "history").as(history => history.length > 0 ? "history" : "history hide"),
        children: [
            new Widget.Scrollable({
                className: "history",
                hscroll: Gtk.PolicyType.NEVER,
                vscroll: Gtk.PolicyType.AUTOMATIC,
                propagateNaturalHeight: true,
                propagateNaturalWidth: false,
                onDraw: (scrollable) => {
                    if(!(scrollable.get_child()! as Gtk.Viewport).get_child()) return;

                    scrollable.minContentHeight = 
                        ((scrollable.get_child()! as Gtk.Viewport).get_child() as Widget.Box
                            ).get_children()?.[0].get_allocation().height 
                        || 0;
                },
                child: new Widget.Box({
                    className: "notifications",
                    hexpand: true,
                    orientation: Gtk.Orientation.VERTICAL,
                    homogeneous: false,
                    spacing: 4,
                    valign: Gtk.Align.START,
                    children: bind(Notifications.getDefault(), "history").as((history: Array<HistoryNotification>) =>
                        history.map((notification: HistoryNotification) => NotificationWidget(notification, 
                            () => Notifications.getDefault().removeHistory(notification.id), true)
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
                                    label: tr("clear")
                                } as Widget.LabelProps)
                            ]
                        } as Widget.BoxProps),
                        onClick: () => Notifications.getDefault().clearHistory(),
                    } as Widget.ButtonProps)
                ]
            })
        ]
    } as Widget.BoxProps);
}
