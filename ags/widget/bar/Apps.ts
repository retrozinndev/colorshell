import { Gtk, Widget } from "astal/gtk3";
import { tr } from "../../i18n/intl";
import { Windows } from "../../windows";
import { bind } from "astal";

export function Apps(): Gtk.Widget {
    return new Widget.EventBox({
        onClickRelease: () => Windows.open("apps-window"),
        className: bind(Windows, "openWindows").as((openWindows) => 
            Object.hasOwn(openWindows, "apps-window") ? "apps open" : "apps"),
        child: new Widget.Box({
            child: new Widget.Icon({
                tooltipText: tr("apps"),
                icon: "applications-other-symbolic",
                halign: Gtk.Align.CENTER,
                hexpand: true
            } as Widget.IconProps)
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
