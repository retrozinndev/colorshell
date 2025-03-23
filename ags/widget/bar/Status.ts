import AstalBluetooth from "gi://AstalBluetooth";
import AstalNetwork from "gi://AstalNetwork";
import AstalWp from "gi://AstalWp";

import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../../scripts/volume";
import { ControlCenter } from "../../window/ControlCenter";
import { Notifications } from "../../scripts/notifications";
import { Windows } from "../../windows";


export function Status(): Gtk.Widget {
    return new Widget.EventBox({
        className: bind(ControlCenter, "visible").as((visible: boolean) => 
            visible ? "status open" : "status"),
        onClick: () => Windows.toggle(ControlCenter!),
        child: new Widget.Box({
            children: [
                volumeStatusSlider({
                    className: "sink",
                    endpoint: Wireplumber.getDefault().getDefaultSink(),
                    icon: "󰕾"
                }),
                volumeStatusSlider({
                    className: "source",
                    endpoint: Wireplumber.getDefault().getDefaultSource(),
                    icon: "󰍬"
                }),
                StatusIcons()
            ]
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}

function volumeStatusSlider(props: { className?: string, endpoint: AstalWp.Endpoint, icon: string }): Gtk.Widget {
    return new Widget.EventBox({
        className: props.className,
        onScroll: (_, event) => 
            event.delta_y > 0 ?
                Wireplumber.getDefault().decreaseEndpointVolume(props.endpoint, 5)
            :
                Wireplumber.getDefault().increaseEndpointVolume(props.endpoint, 5),
        setup: (eventbox) => {
            const connections: Array<number> = [];
            connections.push(eventbox.connect("destroy-event", () => 
                connections.map(id => eventbox.disconnect(id))));

            eventbox.add(new Widget.Box({
                children: [
                    new Widget.Label({
                        className: "nf",
                        label: props.icon,
                    } as Widget.LabelProps),
                    new Widget.Revealer({
                        revealChild: false,
                        transitionType: Gtk.RevealerTransitionType.SLIDE_RIGHT,
                        transitionDuration: 350,
                        setup: (revealer) => {
                            connections.push(
                                eventbox.connect("hover", () => revealer.revealChild = true),
                                eventbox.connect("hover-lost", () => revealer.revealChild = false));

                            revealer.add(new Widget.Slider({
                                className: "slider",
                                onDragged: (slider) => props.endpoint.set_volume(slider.value / 100),
                                value: bind(props.endpoint, "volume").as((volume) => 
                                    Math.floor(volume * 100)),
                                max: 100
                            } as Widget.SliderProps));
                        }
                    } as Widget.RevealerProps),
                    new Widget.Label({
                        className: "volume",
                        label: bind(props.endpoint, "volume").as((volume: number) => 
                            Math.floor(volume * 100) + "%")
                    } as Widget.LabelProps),
                ]
            } as Widget.BoxProps))
        }
    } as Widget.EventBoxProps)
}

function StatusIcons(): Gtk.Widget {
    return new Widget.Box({
        className: "status-icons",
        children: [
            new Widget.Label({
                className: "bluetooth nf state",
                label: Variable.derive([
                    bind(AstalBluetooth.get_default(), "isPowered"),
                    bind(AstalBluetooth.get_default(), "isConnected")
                ], (powered, connected) => {
                    return powered ? (
                        connected ? "󰂱"
                        : "󰂯"
                    ) : "󰂲"
                })()
            } as Widget.LabelProps),
            new Widget.Label({
                className: "network nf state",
                label: Variable.derive([
                    bind(AstalNetwork.get_default(), "primary"),
                    bind(AstalNetwork.get_default(), "wired"),
                    bind(AstalNetwork.get_default(), "wifi")
                ],
                (primary, wired, wifi) => {
                    switch(primary) {
                        case AstalNetwork.Primary.WIRED: return wired ? 
                                "󰛳"
                            : "󰛵";

                        case AstalNetwork.Primary.WIFI: return wifi ?
                                "󰤨"
                            : "󰤭";
                    }

                    return "󰲊";
                })()
            } as Widget.LabelProps),
            new Widget.Label({
                className: "bell nf state",
                label: bind(Notifications.getDefault().getNotifd(), "dontDisturb").as((dnd: boolean) => 
                    dnd ? "󰂠" : "󰂚")
            } as Widget.LabelProps),
        ]
    } as Widget.BoxProps);
}
