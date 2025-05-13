import { Astal, Gtk, Widget } from "astal/gtk3";
import { bind, GLib } from "astal";

import { getDateTime } from "../scripts/time";
import { Separator, SeparatorProps } from "../widget/Separator";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { BigMedia } from "../widget/center-window/BigMedia";
import AstalMpris from "gi://AstalMpris";

export const CenterWindow = (mon: number) => PopupWindow({
    namespace: "center-window",
    marginTop: 10,
    anchor: Astal.WindowAnchor.TOP,
    monitor: mon,
    child: new Widget.Box({
        className: "center-window-container",
        spacing: 6,
        children: [
            new Widget.Box({
                className: "left",
                orientation: Gtk.Orientation.VERTICAL,
                children: [
                    new Widget.Box({
                        className: "datetime",
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
                                    dateTime.format("%A, %B %d"))
                            } as Widget.LabelProps)
                        ]
                    } as Widget.BoxProps),
                    new Widget.Box({
                        className: "calendar-box",
                        vexpand: false,
                        hexpand: true,
                        valign: Gtk.Align.START,
                        child: new Gtk.Calendar({
                            visible: true,
                            showHeading: true,
                            showDayNames: true,
                            showWeekNumbers: false
                        } as Gtk.Calendar.ConstructorProps)
                    } as Widget.BoxProps)
                ]
            } as Widget.BoxProps),
            Separator({
                orientation: Gtk.Orientation.HORIZONTAL,
                cssColor: "gray",
                margin: 5,
                alpha: .3,
                visible: bind(AstalMpris.get_default(), "players").as(players => players.length > 0),
            } as SeparatorProps),
            BigMedia()
        ]
    } as Widget.BoxProps)
} as PopupWindowProps);
