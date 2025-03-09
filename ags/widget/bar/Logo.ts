import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { trGet } from "../../i18n/intl";

export function Logo(): Gtk.Widget {
    return new Widget.EventBox({
        onClickRelease: () => AstalHyprland.get_default().dispatch("exec", "anyrun"),
        className: "logo",
        child: new Widget.Box({
            child: new Widget.Label({
                className: "nf",
                tooltipText: trGet()["bar"]["apps"]["tooltip"],
                label: ""
            } as Widget.LabelProps)
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
