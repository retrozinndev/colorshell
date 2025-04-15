import { Astal, Gtk, Widget } from "astal/gtk3";
import { bind, GLib } from "astal";

import { getDateTime } from "../scripts/time";
import { Separator, SeparatorProps } from "../widget/Separator";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { BigMedia } from "../widget/center-window/BigMedia";
import AstalMpris from "gi://AstalMpris?version=0.1";

export const CenterWindow = (mon: number) => PopupWindow({
    namespace: "center-window",
    marginTop: 10,
    anchor: Astal.WindowAnchor.TOP,
    monitor: mon,
    child: new Widget.Box({
        className: "center-window-container",
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
            new Widget.Revealer({
                revealChild: bind(AstalMpris.get_default(), "players").as(players => 
                    players.filter(player => player.available).length > 0),
                transitionDuration: 220,
                transitionType: Gtk.RevealerTransitionType.SLIDE_RIGHT,
                child: new Widget.Box({
                    children: [
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
                } as Widget.BoxProps)
            } as Widget.RevealerProps)
        ]
    } as Widget.BoxProps)
} as PopupWindowProps);
