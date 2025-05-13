import { bind, Variable } from "astal";
import { astalify, Gtk, Widget } from "astal/gtk3";
import AstalBluetooth from "gi://AstalBluetooth";
import { Page, PageButton } from "./Page";
import { Separator, SeparatorProps } from "../../Separator";
import { tr } from "../../../i18n/intl";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { Windows } from "../../../windows";


const AstalSpinner = astalify(Gtk.Spinner);

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
                    stopBluetoothDevicesWatch();
                    return;
                }

                watchNewDevices();
            }
        } as Widget.ButtonProps)
    ],
    onClose: () => stopBluetoothDevicesWatch(),
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
                    visible: bind(AstalBluetooth.get_default(), "devices").as((devs) => 
                        devs.filter(dev => dev.paired || dev.connected).length > 0),
                    children: bind(AstalBluetooth.get_default(), "devices").as((devs: Array<AstalBluetooth.Device>) => {
                        const connectedDevices = devs.filter((dev: AstalBluetooth.Device) => dev.connected || dev.paired)

                        return [
                            new Widget.Label({
                                className: "sub-header",
                                label: tr("control_center.pages.bluetooth.paired_devices"),
                                xalign: 0,
                            } as Widget.LabelProps),
                            ...connectedDevices.map((dev: AstalBluetooth.Device) => DeviceWidget(dev))
                        ]
                    })
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "discovered",
                    orientation: Gtk.Orientation.VERTICAL,
                    visible: bind(AstalBluetooth.get_default(), "devices").as((devs) => 
                        devs.filter((dev) => !dev.connected && !dev.paired).length > 0),
                    children: bind(AstalBluetooth.get_default(), "devices").as((devices: Array<AstalBluetooth.Device>) => {
                        const discoveredDevices = devices.filter((dev: AstalBluetooth.Device) => !dev.connected && !dev.paired);

                        return [
                            new Widget.Label({
                                className: "sub-header",
                                label: tr("control_center.pages.bluetooth.new_devices"),
                                xalign: 0
                            } as Widget.LabelProps),
                            ...discoveredDevices.map((dev: AstalBluetooth.Device) => DeviceWidget(dev))
                        ]
                    })
                } as Widget.BoxProps),
                Separator({
                    size: .2,
                    orientation: Gtk.Orientation.VERTICAL,
                    cssColor: "gray",
                    alpha: .2
                } as SeparatorProps),
                new Widget.Button({
                    className: "more",
                    label: tr("control_center.pages.more_settings"),
                    onClick: () => {
                        Windows.close("control-center");
                        AstalHyprland.get_default().dispatch("exec", "[float; animation slide right] overskride");
                    },
                    setup: (self) => self.set_alignment(0, 0.5)
                } as Widget.ButtonProps)
            ]
        } as Widget.BoxProps)
    ]
});

function DeviceWidget(dev: AstalBluetooth.Device): Gtk.Widget {
    return PageButton({
        className: bind(dev, "connected").as((connected) => connected ? "connected" : ""),
        title: bind(dev, "alias").as(alias => alias ?? "Unknown Device"),
        icon: dev.icon ?? "bluetooth-active-symbolic",
        onClick: () => {
            if(dev.paired) {
                dev.connected ? 
                    dev.disconnect_device(null)
                : dev.connect_device(null);

                return;
            }

            dev.pair();
            dev.connected ? 
                dev.disconnect_device(null)
            : dev.connect_device(null);
        },
        endWidget: new Widget.Box({
            visible: bind(dev, "batteryPercentage").as((bat: number) => 
                bat <= -1 ? false : true),
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
                } as Widget.BoxProps),
                new Widget.Box({
                    visible: bind(dev, "connecting"),
                    setup: (self) => {
                        const spinner = new AstalSpinner();

                        self.add(spinner);
                    }
                } as Widget.BoxProps)
                // Spinner here
            ]
        } as Widget.BoxProps),
        extraButtons: Variable.derive([
            bind(dev, "connected"),
            bind(dev, "paired"),
            bind(dev, "trusted")
        ], (connected, paired, trusted) => [
            new Widget.Button({
                className: "nf",
                visible: paired && connected,
                label: connected ? "󰅖" : "",
                tooltipText: tr("disconnect"),
                onClick: () => dev.disconnect_device()
            } as Widget.ButtonProps),
            new Widget.Button({
                visible: !connected && paired,
                className: "nf",
                label: "󰢃",
                tooltipText: tr("control_center.pages.bluetooth.unpair_device"),
                onClick: () => AstalBluetooth.get_default().adapter?.remove_device(dev)
            } as Widget.ButtonProps),
            new Widget.Button({
                className: "nf",
                visible: paired,
                label: trusted ? "󰫜" : "󰫚",
                tooltipText: trusted ? 
                    tr("control_center.pages.bluetooth.untrust_device")
                : tr("control_center.pages.bluetooth.trust_device"),
                onClick: () => trusted ? dev.set_trusted(false) : dev.set_trusted(true)
            } as Widget.ButtonProps)
        ])()
    });
}

function watchNewDevices(): void {
    !AstalBluetooth.get_default().adapter.discovering && 
        AstalBluetooth.get_default().adapter.start_discovery();
}

export function stopBluetoothDevicesWatch(): void {
    AstalBluetooth.get_default().adapter.discovering && 
        AstalBluetooth.get_default().adapter.stop_discovery();
}
