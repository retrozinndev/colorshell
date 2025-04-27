import AstalBluetooth from "gi://AstalBluetooth";
import AstalNetwork from "gi://AstalNetwork";
import AstalWp from "gi://AstalWp";

import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../../scripts/volume";
import { Notifications } from "../../scripts/notifications";
import { Windows } from "../../windows";


export function Status(): Gtk.Widget {
    return new Widget.EventBox({
        className: bind(Windows, "openWindows").as((openWins) => 
            Object.hasOwn(openWins, "control-center") ? "open status" : "status"),
        onClick: () => Windows.toggle("control-center"),
        child: new Widget.Box({
            children: [
                volumeStatus({
                    className: "sink",
                    endpoint: Wireplumber.getDefault().getDefaultSink(),
                    icon: "󰕾"
                }),
                volumeStatus({
                    className: "source",
                    endpoint: Wireplumber.getDefault().getDefaultSource(),
                    icon: "󰍬"
                }),
                StatusIcons()
            ]
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}

function volumeStatus(props: { className?: string, endpoint: AstalWp.Endpoint, icon: string }): Gtk.Widget {
    return new Widget.EventBox({
        className: props.className,
        onScroll: (_, event) => 
            event.delta_y > 0 ?
                Wireplumber.getDefault().decreaseEndpointVolume(props.endpoint, 5)
            :
                Wireplumber.getDefault().increaseEndpointVolume(props.endpoint, 5),
            child: new Widget.Box({
                children: [
                    new Widget.Label({
                        className: "nf",
                        label: props.icon,
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "volume",
                        label: bind(props.endpoint, "volume").as((volume: number) => 
                            Math.floor(volume * 100) + "%")
                    } as Widget.LabelProps),
                ]
            } as Widget.BoxProps)
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
