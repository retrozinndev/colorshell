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
                )
            }),
            new Widget.Box({
                className: "text-content",
                orientation: Gtk.Orientation.VERTICAL,
                homogeneous: false,
                valign: Gtk.Align.CENTER,
                children: bind(hyprland, "focusedClient").as((focusedClient: AstalHyprland.Client) =>
                    focusedClient ? [
                        new Widget.Label({
                            className: "class",
                            xalign: 0,
                            max_width_chars: 65,
                            truncate: false,
                            label: bind(focusedClient, "class")
                        } as Widget.LabelProps),
                        new Widget.Label({
                            className: "title",
                            xalign: 0,
                            max_width_chars: 48,
                            truncate: false,
                            label: bind(focusedClient, "title")
                        } as Widget.LabelProps)
                    ] : []
                )
            })
        ]
    } as Widget.BoxProps);
}
