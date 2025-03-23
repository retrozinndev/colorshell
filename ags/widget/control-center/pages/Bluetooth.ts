import { AstalIO, bind, timeout } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalBluetooth from "gi://AstalBluetooth";
import { Page } from "./Page";
import { Separator, SeparatorProps } from "../../Separator";

let watchingDevices: boolean = false;
let watchTimeout: (AstalIO.Time|undefined);

export const BluetoothPage: Page = new Page({
    title: "Bluetooth Devices",
    description: "Manage your Bluetooth devices and add new ones.",
    className: "bluetooth",
    setup: () => {
        watchingDevices = true;
        watchNewDevices();
    },
    onClose: stopBluetoothDevicesWatch,
    pageChild: () => new Widget.Box({
        className: "connections",
        orientation: Gtk.Orientation.VERTICAL,
        expand: true,
        hexpand: true,
        children: [
            new Widget.Box({
                className: "paired",
                orientation: Gtk.Orientation.VERTICAL,
                children: bind(AstalBluetooth.get_default(), "devices").as((devices: Array<AstalBluetooth.Device>) => 
                    devices.filter((device: AstalBluetooth.Device) => device.connected || device.paired)
                    .map((dev: AstalBluetooth.Device) => 
                        DeviceWidget(dev)
                    )
                )
            } as Widget.BoxProps),
            Separator({
                size: .5,
                orientation: Gtk.Orientation.VERTICAL,
                alpha: .7
            } as SeparatorProps),
            new Widget.Box({
                className: "discovered",
                orientation: Gtk.Orientation.VERTICAL,
                children: bind(AstalBluetooth.get_default(), "devices").as((devices: Array<AstalBluetooth.Device>) =>
                    devices.filter((device: AstalBluetooth.Device) => !device.connected && !device.paired)
                    .map((dev: AstalBluetooth.Device) => 
                        DeviceWidget(dev)
                    )
                )
            } as Widget.BoxProps)
        ]
    } as Widget.BoxProps)
});

function DeviceWidget(dev: AstalBluetooth.Device): Gtk.Widget {
    return new Widget.Button({
        onClick: () => dev.connected ? dev.disconnect_device(null) : dev.connect_device(null),
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
                    label: bind(dev, "alias")
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
    if(!watchTimeout) {
        watchTimeout = timeout(5000, () => {
            reloadBluetoothDevicesList(2500);
            watchNewDevices();
            watchTimeout = undefined;
        });

        return;
    }

    stopBluetoothDevicesWatch();
}

export function stopBluetoothDevicesWatch(): void {
    watchingDevices = false;
    watchTimeout?.cancel();
    watchTimeout = undefined;

    AstalBluetooth.get_default().adapter.discovering && 
        AstalBluetooth.get_default().adapter.stop_discovery();
}

export function reloadBluetoothDevicesList(discoveryTimeout?: number): void {
    AstalBluetooth.get_default().adapter.start_discovery();
    timeout(discoveryTimeout || 2500, () => 
        AstalBluetooth.get_default().adapter.stop_discovery());
}
