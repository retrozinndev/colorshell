import { Gtk, Widget } from "astal/gtk3";
import { getDateTime } from "../../scripts/time";
import { bind, GLib } from "astal";
import { Windows } from "../../windows";

export function Clock(): Gtk.Widget {
    return new Widget.Box({
        className: bind(Windows, "openWindows").as((openWins) => 
            Object.hasOwn(openWins, "center-window") ? "open clock" : "clock"),
        child: new Widget.Button({
            onClick: () => Windows.toggle("center-window"),
            label: getDateTime().as((dateTime: GLib.DateTime) => {
                return dateTime.format("%A %d, %H:%M")
            })
        } as Widget.ButtonProps)
    } as Widget.BoxProps);
}
