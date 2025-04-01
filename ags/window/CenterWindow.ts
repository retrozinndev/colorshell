import { Gtk, Widget } from "astal/gtk3";
import { GLib } from "astal";

import { getDateTime } from "../scripts/time";
import { Separator, SeparatorProps } from "../widget/Separator";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { BigMedia } from "../widget/center-window/BigMedia";

export const CenterWindow = (mon: number) => PopupWindow({
    className: "center-window-container",
    namespace: "center-window",
    marginTop: 10,
    valign: Gtk.Align.START,
    halign: Gtk.Align.CENTER,
    monitor: mon,
    children: [
        new Widget.Box({
            className: "vertical left",
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.Box({
                    className: "top",
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
            alpha: .5,
            cssColor: "gray",
            size: 1
        } as SeparatorProps),
        new Widget.Box({
            className: "vertical right",
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                BigMedia()
            ]
        } as Widget.BoxProps)
    ]
} as PopupWindowProps);
