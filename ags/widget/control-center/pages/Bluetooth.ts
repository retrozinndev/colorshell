import { bind, Gio, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalBluetooth from "gi://AstalBluetooth";
import { Page, PageButton } from "./Page";
import { tr } from "../../../i18n/intl";
import { Windows } from "../../../windows";
import { Notifications } from "../../../scripts/notifications";
import AstalNotifd from "gi://AstalNotifd";
import { execApp } from "../../../scripts/apps";

export const BluetoothPage: (() => Page) = () => new Page({
    id: "bluetooth",
    title: tr("control_center.pages.bluetooth.title"),
    description: tr("control_center.pages.bluetooth.description"),
    className: "bluetooth",
    headerButtons: [
        new Widget.Button({
            className: "discover",
            image: new Widget.Icon({
                icon: bind(AstalBluetooth.get_default().adapter, "discovering").as((discovering) => 
                    !discovering ? 
                        "arrow-circular-top-right-symbolic" 
                    : "media-playback-stop-symbolic")
            } as Widget.IconProps),
            tooltipText: bind(AstalBluetooth.get_default().adapter, "discovering").as((discovering) => 
                !discovering ? 
                    tr("control_center.pages.bluetooth.start_discovering")
                : tr("control_center.pages.bluetooth.stop_discovering")),
            onClick: () => {
                if(AstalBluetooth.get_default().adapter.discovering) {
                    AstalBluetooth.get_default().adapter.stop_discovery();
                    return;
                }

                AstalBluetooth.get_default().adapter.start_discovery();
            }
        } as Widget.ButtonProps)
    ],
    onClose: () => AstalBluetooth.get_default().adapter.discovering && 
        AstalBluetooth.get_default().adapter.stop_discovery(),
    bottomButtons: [{
        title: tr("control_center.pages.more_settings"),
        onClick: () => {
            Windows.close("control-center");
            execApp("overskride", "[float; animation slide right]");
        }
    }],
    spacing: 2,
    children: [
        new Widget.Box({
            className: "adapters",
            visible: bind(AstalBluetooth.get_default(), "adapters").as((adapters) => 
                adapters.length > 1),
            spacing: 2,
            children: bind(AstalBluetooth.get_default(), "adapters").as((adapters) => [
                    new Widget.Label({
                        className: "sub-header",
                        label: tr("control_center.pages.bluetooth.adapters")
                    } as Widget.LabelProps),
                    ...adapters.map(adapter =>
                        PageButton({
                            title: adapter.alias ?? "Adapter",
                            icon: "bluetooth-active-symbolic",
                            onClick: () => AstalBluetooth.get_default(),
                        })
                    )
                ]
            )
        } as Widget.BoxProps),
        new Widget.Box({
            className: "connections",
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: true,
            spacing: 2,
            children: [
                new Widget.Box({
                    className: "paired",
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 2,
                    visible: bind(AstalBluetooth.get_default(), "devices").as((devs) => 
                        devs.filter(dev => dev.paired || dev.connected || dev.trusted).length > 0),
                    children: bind(AstalBluetooth.get_default(), "devices").as((devs) => {
                        const connectedDevices = devs.filter((dev) => dev.connected || dev.paired || dev.trusted)

                        return [
                            new Widget.Label({
                                className: "sub-header",
                                label: tr("devices"),
                                xalign: 0,
                            } as Widget.LabelProps),
                            ...connectedDevices.map((dev) => DeviceWidget(dev))
                        ]
                    })
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "discovered",
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 2,
                    visible: bind(AstalBluetooth.get_default(), "devices").as((devs) => 
                        devs.filter((dev) => !dev.connected && !dev.paired && !dev.trusted).length > 0),
                    children: bind(AstalBluetooth.get_default(), "devices").as((devices) => {
                        const discoveredDevices = devices.filter((dev) => !dev.connected && !dev.paired && !dev.trusted);

                        return [
                            new Widget.Label({
                                className: "sub-header",
                                label: tr("control_center.pages.bluetooth.new_devices"),
                                xalign: 0
                            } as Widget.LabelProps),
                            ...discoveredDevices.map((dev: AstalBluetooth.Device) => DeviceWidget(dev))
                        ]
                    })
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    ]
});

function DeviceWidget(dev: AstalBluetooth.Device): Gtk.Widget {
    const devActions: Variable<Array<Widget.Button>> = Variable.derive([
        bind(dev, "connected"),
        bind(dev, "paired"),
        bind(dev, "trusted")
    ], (connected, paired, trusted) => paired ? [
        new Widget.Button({
            image: new Widget.Icon({
                icon: connected ? 
                    "list-remove-symbolic"
                : "user-trash-symbolic"
            } as Widget.IconProps),
            tooltipText: tr(connected ? "disconnect" : "control_center.pages.bluetooth.unpair_device"),
            onClick: () => {
                if(!connected) {
                    AstalBluetooth.get_default().adapter?.remove_device(dev);
                    return;
                }

                dev.disconnect_device(null);
            },
        } as Widget.ButtonProps),
        new Widget.Button({
            image: new Widget.Icon({
                icon: trusted ? 
                    "shield-safe-symbolic"
                : "shield-danger-symbolic"
            } as Widget.IconProps),
            tooltipText: tr(`control_center.pages.bluetooth.${trusted ? "un": ""}trust_device`),
            onClick: () => dev.set_trusted(!trusted)
        } as Widget.ButtonProps)
    ] : []);

    return PageButton({
        className: bind(dev, "connected").as((connected) => connected ? "connected" : ""),
        title: bind(dev, "alias").as(alias => alias ?? "Unknown Device"),
        icon: dev.icon ?? "bluetooth-active-symbolic",
        description: bind(dev, "connecting").as(connecting => 
            connecting ? `${tr("connecting")}...` : ""),
        tooltipText: bind(dev, "connected").as(connected => !connected ? 
            tr("connect")
        : ""),
        onDestroy: () => devActions.drop(),
        onClick: () => {
            if(dev.connected) return;

            let skipConnection: boolean = false;
            if(!dev.paired) 
                (async () => dev.pair())().catch((err: Gio.IOErrorEnum) => {
                    skipConnection = true;
                    Notifications.getDefault().sendNotification({
                        appName: "bluetooth",
                        summary: "Device pairing error",
                        body: `Couldn't connect to ${dev.alias ?? dev.name}, an error occurred: ${err.message || err.stack}`,
                        urgency: AstalNotifd.Urgency.NORMAL
                    })
                }).then(() => dev.set_trusted(true));

            if(!skipConnection)
                (async () => dev.connect_device(null))().catch((err: Gio.IOErrorEnum) => 
                    Notifications.getDefault().sendNotification({
                        appName: "bluetooth",
                        summary: "Device connection error",
                        body: `Couldn't connect to ${dev.alias ?? dev.name}, an error occurred: ${err.message || err.stack}`,
                        urgency: AstalNotifd.Urgency.NORMAL
                    })
                );
        },
        endWidget: new Widget.Box({
            visible: bind(dev, "batteryPercentage").as((batt: number) => 
                batt <= -1 ? false : true),
            children: [
                new Widget.Box({
                    visible: bind(dev, "connected"),
                    children: [
                        new Widget.Label({
                            halign: Gtk.Align.END,
                            label: bind(dev, "batteryPercentage").as((batt: number) =>
                                `${Math.floor(batt * 100)}%`)
                        } as Widget.LabelProps),
                        new Widget.Icon({
                            icon: bind(dev, "batteryPercentage").as(batt => 
                                `battery-level-${Math.floor(batt * 100)}-symbolic`),
                            css: "font-size: 16px; margin-left: 6px;"
                        } as Widget.IconProps)
                    ]
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps),
        extraButtons: devActions()
    });
}
