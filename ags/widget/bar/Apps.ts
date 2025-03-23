import { Gtk, Widget } from "astal/gtk3";
import { tr } from "../../i18n/intl";
import { Windows } from "../../windows";

export function Apps(): Gtk.Widget {
    return new Widget.EventBox({
        onClickRelease: () => Windows.getWindow("apps-window")?.show(),
        className: "apps",
        child: new Widget.Box({
            child: new Widget.Label({
                className: "nf",
                tooltipText: tr("bar.apps.tooltip"),
                label: ""
            } as Widget.LabelProps)
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
