import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalHyprland from "gi://AstalHyprland";
import { getAppIcon } from "../../scripts/apps";

const hyprland = AstalHyprland.get_default();

export function FocusedClient(): Gtk.Widget {
    return new Widget.Box({
        className: "focused-client",
        visible: bind(hyprland, "focusedClient").as(Boolean),
        children: bind(hyprland, "focusedClient").as(focusedClient => focusedClient ? [
            new Widget.Icon({
                className: "icon",
                vexpand: true,
                css: ".icon { font-size: 18px; }",
                icon: bind(focusedClient, "class").as(clss => 
                    getAppIcon(clss) ?? "application-x-executable-symbolic")
            }),
            new Widget.Box({
                className: "text-content",
                orientation: Gtk.Orientation.VERTICAL,
                homogeneous: false,
                valign: Gtk.Align.CENTER,
                children: [
                    new Widget.Label({
                        className: "class",
                        xalign: 0,
                        visible: bind(focusedClient, "class").as(Boolean),
                        maxWidthChars: 55,
                        truncate: true,
                        tooltipText: bind(focusedClient, "class").as((clientClass: string) => 
                            clientClass.length > 55 ? clientClass : ""),
                        label: bind(focusedClient, "class")
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "title",
                        xalign: 0,
                        maxWidthChars: 50,
                        visible: bind(focusedClient, "title").as(Boolean),
                        truncate: true,
                        tooltipText: bind(focusedClient, "title").as((clientTitle: string) => 
                            clientTitle.length > 55 ? clientTitle : ""),
                        label: bind(focusedClient, "title")
                    } as Widget.LabelProps)
                ]
            })
        ]: [])
    } as Widget.BoxProps);
}
