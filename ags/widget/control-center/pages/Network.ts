import { Gtk, Widget } from "astal/gtk3";
import { Page, PageButton } from "./Page";
import AstalNetwork from "gi://AstalNetwork";
import { bind } from "astal";
import NM from "gi://NM";
import { Windows } from "../../../windows";
import { tr } from "../../../i18n/intl";
import { execApp } from "../../../scripts/apps";

export const PageNetwork: (() => Page) = () => new Page({
    id: "network",
    title: tr("control_center.pages.network.title"),
    className: "network",
    headerButtons: [
        new Widget.Button({
            className: "reload",
            image: new Widget.Icon({
                icon: "arrow-circular-top-right-symbolic"
            } as Widget.IconProps),
            visible: bind(AstalNetwork.get_default(), "primary").as((primary) => 
                primary === AstalNetwork.Primary.WIFI),
            tooltipText: "Re-scan connections",
            onClick: () => AstalNetwork.get_default().wifi.scan()
        } as Widget.ButtonProps)
    ],
    bottomButtons: [{
        title: tr("control_center.pages.more_settings"),
        onClick: () => {
            Windows.close("control-center");
            execApp("nm-connection-editor", "[animationstyle gnomed]");
        }
    }],
    children: [
        new Widget.Box({
            className: "devices",
            hexpand: true,
            orientation: Gtk.Orientation.VERTICAL,
            visible: bind(AstalNetwork.get_default().get_client(), "devices").as((devs) => devs.length > 0),
            children: bind(AstalNetwork.get_default().get_client(), "devices").as((devices) => {
                devices = devices.filter(dev => dev.interface !== "lo");

                return [
                    new Widget.Label({
                        label: tr("devices"),
                        xalign: 0,
                        className: "sub-header",
                    } as Widget.LabelProps),
                    ...devices.filter(device => device.real).map(dev => PageButton({
                            className: "device",
                            icon: bind(dev, "deviceType").as(deviceType => 
                                deviceType === NM.DeviceType.WIFI ? 
                                    "network-wireless-symbolic"
                                : "network-wired-symbolic"),
                            title: bind(dev, "interface").as(iface => iface ?? 
                                tr("control_center.pages.network.interface")),
                            extraButtons: [
                                new Widget.Button({
                                    image: new Widget.Icon({
                                        icon: "view-more-symbolic"
                                    } as Widget.IconProps),
                                    onClick: () => {
                                        Windows.close("control-center");
                                        execApp(
                                            `nm-connection-editor --edit ${dev.activeConnection?.connection.get_uuid()}`,
                                            "[animationstyle gnomed; float]"
                                        );
                                    }
                                } as Widget.ButtonProps)
                            ]
                        })
                    )
                ]
            })
        } as Widget.BoxProps),
        new Widget.Box({
            className: "wireless-aps",
            visible: bind(AstalNetwork.get_default(), "primary").as((primary) => primary === AstalNetwork.Primary.WIFI),
            hexpand: true,
            orientation: Gtk.Orientation.VERTICAL,
            children: AstalNetwork.get_default().wifi ? bind(AstalNetwork.get_default().wifi.get_device(), "accessPoints").as((aps) =>
                aps.map(ap => new Widget.Button({
                    hexpand: true,
                    onClick: () => console.log("connect to " + ap.get_ssid().toArray().toString()), // TODO I don't have a WiFi board :(
                    child: new Widget.Box({
                        hexpand: true,
                        children: [
                            new Widget.Icon({
                                halign: Gtk.Align.START,
                                className: "icon",
                                icon: "network-wireless-signal-excellent-symbolic"
                            } as Widget.IconProps),
                            new Widget.Label({
                                className: "ssid",
                                halign: Gtk.Align.START,
                                label: (getDecoded(ap.ssid.get_data()) ?? ap.ssid.get_data().toString()) ?? "Wi-Fi"
                            } as Widget.LabelProps),
                            new Widget.Label({
                                className: "status",
                            } as Widget.LabelProps)
                        ]
                    } as Widget.BoxProps)
                } as Widget.ButtonProps))) : [],
        } as Widget.BoxProps)
    ]
});

