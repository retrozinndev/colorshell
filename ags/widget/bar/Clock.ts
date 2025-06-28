import { Gtk, Widget } from "astal/gtk3";
import { getDateTime } from "../../scripts/time";
import { bind, GLib } from "astal";
import { Windows } from "../../windows";
import { Config } from "../../scripts/config";

export function Clock(): Gtk.Widget {
    return new Widget.Box({
        className: bind(Windows, "openWindows").as((openWins) => 
            Object.hasOwn(openWins, "center-window") ? "open clock" : "clock"),
        child: new Widget.Button({
            onClick: () => Windows.toggle("center-window"),
            label: getDateTime().as((dateTime: GLib.DateTime) => 
                dateTime.format(Config.getDefault().getProperty("clock.date_format", "string") as string))
        } as Widget.ButtonProps)
    } as Widget.BoxProps);
}
