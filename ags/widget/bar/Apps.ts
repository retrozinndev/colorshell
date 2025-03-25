import { Gtk, Widget } from "astal/gtk3";
import { tr } from "../../i18n/intl";
import { Windows } from "../../windows";

export function Apps(): Gtk.Widget {
    return new Widget.EventBox({
        onClickRelease: () => Windows.getWindow("apps-window")?.show(),
        className: "apps",
        child: new Widget.Box({
            child: new Widget.Icon({
                tooltipText: tr("bar.apps.tooltip"),
                icon: "applications-other-symbolic",
                halign: Gtk.Align.CENTER,
                hexpand: true
            } as Widget.IconProps)
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
