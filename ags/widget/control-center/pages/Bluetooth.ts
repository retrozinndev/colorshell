import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalBluetooth from "gi://AstalBluetooth";
import { Page, PageButton } from "./Page";
import { tr } from "../../../i18n/intl";
import AstalHyprland from "gi://AstalHyprland";
import { Windows } from "../../../windows";

export const BluetoothPage: (() => Page) = () => new Page({
    id: "bluetooth",
    title: tr("control_center.pages.bluetooth.title"),
    description: tr("control_center.pages.bluetooth.description"),
    className: "bluetooth",
    headerButtons: [
        new Widget.Button({
            className: "discover nf",
            label: bind(AstalBluetooth.get_default().adapter, "discovering").as((discovering) => 
                !discovering ? '󰑓' : '󰙦'),
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
            AstalHyprland.get_default().dispatch("exec", "[float; animation slide right] overskride");
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
                        devs.filter(dev => dev.paired || dev.connected).length > 0),
                    children: bind(AstalBluetooth.get_default(), "devices").as((devs) => {
                        const connectedDevices = devs.filter((dev) => dev.connected || dev.paired)

                        return [
                            new Widget.Label({
                                className: "sub-header",
                                label: tr("control_center.pages.bluetooth.paired_devices"),
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
                        devs.filter((dev) => !dev.connected && !dev.paired).length > 0),
                    children: bind(AstalBluetooth.get_default(), "devices").as((devices) => {
                        const discoveredDevices = devices.filter((dev) => !dev.connected && !dev.paired);

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
            className: "nf",
            label: connected ? '󰅖' : "󰢃",
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
            className: "nf",
            label: trusted ? "󰫜" : "󰫚",
            tooltipText: tr(`control_center.pages.bluetooth.${trusted ? "un": ""}trust_device`),
            onClick: () => dev.set_trusted(!trusted)
        } as Widget.ButtonProps)
    ] : []);

    return PageButton({
        className: bind(dev, "connected").as((connected) => connected ? "connected" : ""),
        title: bind(dev, "alias").as(alias => alias ?? "Unknown Device"),
        icon: dev.icon ?? "bluetooth-active-symbolic",
        tooltipText: bind(dev, "connected").as(connected => !connected ? 
            tr("connect")
        : ""),
        onDestroy: () => devActions.drop(),
        onClick: () => {
            if(dev.connected) return;
            if(!dev.paired) dev.pair();

            dev.connect_device(null);
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
                            label: bind(dev, "batteryPercentage").as((bat: number) =>
                                `${Math.floor(bat * 100)}%`)
                        } as Widget.LabelProps),
                        new Widget.Icon({
                            icon: "battery-symbolic",
                            css: "font-size: 18px; margin-left: 6px;"
                        } as Widget.IconProps)
                    ]
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps),
        extraButtons: devActions()
    });
}
