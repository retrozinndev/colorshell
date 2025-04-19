import { bind, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalBluetooth from "gi://AstalBluetooth";
import { Page } from "./Page";
import { Separator, SeparatorProps } from "../../Separator";


const watchingDevices = new Variable<boolean>(false);

export const BluetoothPage: Page = new Page({
    title: "Bluetooth Devices",
    description: "Manage your Bluetooth devices and add new ones.",
    className: "bluetooth",
    headerButtons: () => [
        new Widget.Button({
            className: "discover nf",
            label: watchingDevices(watching => !watching ? '󰑓' : '󰙦'),
            tooltipText: watchingDevices(watching => !watching ? "Start discovering" : "Stop discovery"),
            onClick: () => {
                if(watchingDevices.get()) {
                    stopBluetoothDevicesWatch();
                    return;
                }

                watchNewDevices();
            }
        } as Widget.ButtonProps)
    ],
    onClose: () => stopBluetoothDevicesWatch(),
    pageChild: () => new Widget.Box({
        className: "connections",
        orientation: Gtk.Orientation.VERTICAL,
        expand: true,
        hexpand: true,
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
                            label: "Paired Devices",
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
                            label: "Others",
                            xalign: 0
                        } as Widget.LabelProps),
                        ...discoveredDevices.map((dev: AstalBluetooth.Device) => DeviceWidget(dev))
                    ]
                })
            } as Widget.BoxProps),
            Separator({
                size: .2,
                orientation: Gtk.Orientation.VERTICAL,
                alpha: .2
            } as SeparatorProps),
            new Widget.Button({
                className: "more",
                label: "More settings",
                xalign: 0
            } as Widget.ButtonProps)
        ]
    } as Widget.BoxProps)
});

function DeviceWidget(dev: AstalBluetooth.Device): Gtk.Widget {
    return new Widget.Button({
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
        className: bind(dev, "connected").as((connected) => connected ? "connected" : ""),
        child: new Widget.Box({
            className: "device",
            orientation: Gtk.Orientation.HORIZONTAL,
            expand: true,
            children: [
                new Widget.Icon({
                    className: "icon",
                    icon: bind(dev, "icon").as((icon: string) =>
                        icon ? icon : "bluetooth-active-symbolic"),
                    css: "font-size: 20px; margin-right: 6px;"
                } as Widget.IconProps),
                new Widget.Label({
                    className: "alias",
                    halign: Gtk.Align.START,
                    hexpand: true,
                    label: bind(dev, "alias").as((alias) => alias.split('-').length === 6 ? 
                        `Unknown (${alias})` : alias)
                } as Widget.LabelProps),
                new Widget.Label({
                    className: "battery",
                    halign: Gtk.Align.END,
                    visible: bind(dev, "batteryPercentage").as((bat: number) => 
                        bat <= -1 ? false : true),
                    label: bind(dev, "batteryPercentage").as((bat: number) =>
                        `󰁹 ${Math.floor(bat * 100)}%`)
                } as Widget.LabelProps)
            ]
        } as Widget.BoxProps)
    } as Widget.ButtonProps)
}

function watchNewDevices(): void {
    watchingDevices.set(true);
    !AstalBluetooth.get_default().adapter.discovering && 
        AstalBluetooth.get_default().adapter.start_discovery();
}

export function stopBluetoothDevicesWatch(): void {
    watchingDevices.set(false);
    AstalBluetooth.get_default().adapter.discovering && 
        AstalBluetooth.get_default().adapter.stop_discovery();
}
