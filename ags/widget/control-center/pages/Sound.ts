import { Page, PageButton, PageProps } from "./Page";
import { bind, Variable } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { getAppIcon, getIconByAppName, getSymbolicIcon } from "../../../scripts/apps";
import { Wireplumber } from "../../../scripts/volume";
import { tr } from "../../../i18n/intl";
import { analyser } from "../../../scripts/utils";

export function PageSound(): Page {
    const endpoints = Variable.derive([
        bind(Wireplumber.getWireplumber().get_audio()!, "speakers"),
        bind(Wireplumber.getWireplumber().get_audio()!, "streams")
    ]);

    return new Page({
        id: "sound",
        title: tr("control_center.pages.sound.title"),
        description: tr("control_center.pages.sound.description"),
        onClose: endpoints.drop,
        children: endpoints(([speakers, streams]) => [
            new Widget.Label({
                className: "sub-header",
                label: tr("devices"),
                xalign: 0
            } as Widget.LabelProps),
            ...speakers.map((speaker) =>
                PageButton({
                    className: bind(speaker, "isDefault").as(isDefault => isDefault ? "default" : ""),
                    icon: bind(speaker, "icon").as(icon => 
                        getSymbolicIcon(icon) ?? "audio-card-symbolic"),
                    title: bind(speaker, "description").as(desc => desc ?? "Speaker"),
                    onClick: () => speaker.set_is_default(true),
                    endWidget: new Widget.Icon({
                        icon: "object-select-symbolic",
                        visible: bind(speaker, "isDefault"),
                        css: "font-size: 18px;"
                    } as Widget.IconProps)
                })
            ),
            new Widget.Label({
                className: "sub-header",
                label: tr("apps"),
                visible: streams.length > 0,
                xalign: 0
            } as Widget.LabelProps),
            ...streams.map((stream) => 
                    new Widget.EventBox({
                        hexpand: true,
                        setup: (eventbox) => {
                            const connections: Array<number> = [];

                            eventbox.add(new Widget.Box({
                                orientation: Gtk.Orientation.HORIZONTAL,
                                children: [
                                    new Widget.Icon({
                                        icon: bind(stream, "description").as(icon =>
                                            getSymbolicIcon(icon) ?? getIconByAppName(icon) ?? "application-x-executable-symbolic"),
                                        css: "font-size: 20px; margin-right: 6px;"
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
                                                    label: bind(stream, "description").as(desc => { //need to add filter for "audio stream1"
                                                        const maxLength = (35 - (desc.length + 3));
                                                        let title = `${stream.name.substring(0, maxLength)}${stream.name.length >= maxLength ? '...' : ""}`
                                                        return `${desc} - ${title}`;
                                                        }),
                                                    truncate: true,
                                                    tooltipText: bind(stream, "name"),
                                                    className: "name",
                                                    xalign: 0
                                                } as Widget.LabelProps)
                                            } as Widget.RevealerProps),
                                            new Widget.Slider({
                                                min: 0,
                                                drawValue: false,
                                                max: 100,
                                                setup: (self) => self.value = Math.floor(stream.volume * 100),
                                                value: bind(stream, "volume").as((vol) => Math.floor(vol * 100)),
                                                onDragged: (self) => stream.volume = self.value / 100
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
