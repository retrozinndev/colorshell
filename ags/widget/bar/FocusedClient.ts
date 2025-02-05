import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { getAppIcon } from "../../scripts/apps";

const hyprland = AstalHyprland.get_default();

export function FocusedClient() {
    return new Widget.Box({
        className: "focused-client",
        visible: bind(hyprland, "focusedClient").as(Boolean),
        children: [
            new Widget.Icon({
                className: "icon",
                icon: bind(hyprland, "focusedClient").as((client: AstalHyprland.Client) => 
                    client ? 
                        (getAppIcon(client.initialClass) || client.initialClass)
                    :
                        "image-missing"
                ),
                iconSize: Gtk.IconSize.SMALL_TOOLBAR
            }),
            new Widget.Box({
                className: "text-content",
                orientation: Gtk.Orientation.VERTICAL,
                homogeneous: false,
                children: [
                    new Widget.Label({
                        className: "class",
                        xalign: 0,
                        label: bind(hyprland, "focusedClient").as((client: AstalHyprland.Client) =>
                            client ? client.class : "")
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "title",
                        xalign: 0,
                        label: bind(hyprland, "focusedClient").as((client: AstalHyprland.Client) =>
                            client ? client.title : "")
                    } as Widget.LabelProps)
                ]
            })
        ]
    } as Widget.BoxProps);
}
