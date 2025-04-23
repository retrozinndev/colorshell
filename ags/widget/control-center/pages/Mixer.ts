import { Page, PageProps } from "./Page";
import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalWp from "gi://AstalWp";
import { getAppIcon } from "../../../scripts/apps";
import { Wireplumber } from "../../../scripts/volume";

export function PageMixer(): Page {
    return new Page({
        id: "mixer",
        title: "Mixer",
        description: "Control per-application volume!",
        children: bind(Wireplumber.getWireplumber(), "endpoints").as((endpoints) => [
            ...endpoints.filter((ep) => ep.mediaClass === AstalWp.MediaClass.AUDIO_STREAM ||
                ep.mediaClass === AstalWp.MediaClass.VIDEO_STREAM).map((ep) => 
                    new Widget.EventBox({
                        hexpand: true,
                        setup: (eventbox) => {
                            const connections: Array<number> = [];
                            eventbox.add(new Widget.Box({
                                orientation: Gtk.Orientation.HORIZONTAL,
                                children: [
                                    new Widget.Icon({
                                        icon: getAppIcon(ep.name.split(' ')[0]) || "application-x-executable-symbolic",
                                        css: "font-size: 18px; margin-right: 6px;"
                                    } as Widget.IconProps),
                                    new Widget.Box({
                                        orientation: Gtk.Orientation.VERTICAL,
                                        hexpand: true,
                                        children: [
                                            new Widget.Revealer({
                                                transitionDuration: 180,
                                                transitionType: Gtk.RevealerTransitionType.SLIDE_DOWN,
                                                setup: (self) => connections.push(
                                                    eventbox.connect("hover", () => self.revealChild = true),
                                                    eventbox.connect("hover-lost", () => self.revealChild = false)
                                                ),
                                                onDestroy: () => connections.map(id => eventbox.disconnect(id)),
                                                child: new Widget.Label({
                                                    label: ep.name || "Unknown",
                                                    truncate: true,
                                                    tooltipText: ep.name,
                                                    className: "name",
                                                    xalign: 0
                                                } as Widget.LabelProps)
                                            } as Widget.RevealerProps),
                                            new Widget.Slider({
                                                min: 0,
                                                drawValue: false,
                                                max: 100,
                                                setup: (self) => self.value = Math.floor(ep.volume * 100),
                                                value: bind(ep, "volume").as((vol) => Math.floor(vol * 100)),
                                                onDragged: (self) => ep.volume = self.value / 100
                                            } as Widget.SliderProps)
                                        ]
                                    } as Widget.BoxProps)
                                ]
                            } as Widget.BoxProps))
                        }
                    } as Widget.EventBoxProps)
            )
        ])
    } as PageProps);
}
