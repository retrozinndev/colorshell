import { Gtk, Widget } from "astal/gtk3";
import { Page, PageButton } from "./Page";
import AstalNetwork from "gi://AstalNetwork";
import { bind, GLib } from "astal";
import NM from "gi://NM";
import NMA from "gi://NMA";
import { Windows } from "../../../windows";
import { tr } from "../../../i18n/intl";
import { execApp } from "../../../scripts/apps";
import { EntryPopup, EntryPopupProps } from "../../EntryPopup";
import { Notifications } from "../../../scripts/notifications";
import { AskPopup, AskPopupProps } from "../../AskPopup";
import { encoder } from "../../../scripts/utils";
import { setOSDMode } from "../../../window/OSD";

const client = AstalNetwork.get_default().get_client();
export const Network = AstalNetwork.get_default();

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
            visible: bind(Network, "primary").as((primary) => 
                primary === AstalNetwork.Primary.WIFI),
            tooltipText: "Re-scan connections",
            onClick: () => Network.wifi.scan()
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
            visible: bind(Network.get_client(), "devices").as((devs) => devs.length > 0),
            children: bind(Network.get_client(), "devices").as((devices) => {
                devices = devices.filter(dev => dev.interface !== "lo");

                return [
                    new Widget.Label({
                        label: tr("devices"),
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
                            switches: [
                                new Widget.Switch({
                                    css: `margin: 2px 0px;
                                        font-size: 18px;`,
                                    onNotifyActive: (self) => {

                                        const isDeviceActive = dev.state === NM.DeviceState.ACTIVATED

                                        if (self.active === isDeviceActive) {
                                            return;
                                        }
                                        
                                        controlConnection(dev, self.active)
                                    },
                                    state: bind(dev, "state").as(state => state === NM.DeviceState.ACTIVATED ? true : false)
                                } as Widget.SwitchProps) 
                            ],
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
                visible: bind(Network, "primary").as((primary) => primary === AstalNetwork.Primary.WIFI),
                hexpand: true,
                orientation: Gtk.Orientation.VERTICAL,
                children: Network.wifi ? bind(Network.wifi, "accessPoints").as((aps) => [
                    new Widget.Label({
                        className: "sub-header",
                        label: "Wi-Fi"
                        } as Widget.LabelProps),
                            ...aps.filter(ap => ap.ssid).map(ap => {
                                return PageButton({
                                    title: bind(ap, "ssid").as(ssid => 
                                        ssid ?? "Unknown SSID"),
                                    icon: bind(ap, "iconName"),
                                    endWidget: new Widget.Icon({
                                    // @ts-ignore ts-for-gir generated the types wrong
                                    icon: bind(ap, "flags").as(flags => flags & NM["80211ApFlags" as keyof typeof NM].PRIVACY ? 
                                            "channel-secure-symbolic"
                                        : "channel-insecure-symbolic"),
                                    css: "font-size: 18px;"
                                    } as Widget.IconProps),
                                    extraButtons: [
                                        new Widget.Button({
                                            image: new Widget.Icon({
                                                icon: "window-close-symbolic",
                                                css: "font-size: 18px;"
                                            } as Widget.IconProps)
                                        } as Widget.ButtonProps)
                                    ],
                                    onClick: () => {

                                        if (!ap.ssid) {
                                            console.log("I dont see any of ssid...");
                                            return;
                                        }

                                        const savedConnections = client.get_connections();
                                        let existingWifiConnection: NM.RemoteConnection | null;

                                        for (const conn of savedConnections) {
                                            const wirelessSetting = conn.get_setting_wireless();

                                            if (wirelessSetting && wirelessSetting.ssid && GLib.Bytes.new(encoder.encode(wirelessSetting.ssid)) === ap.ssid) {
                                                console.log("Got ssid!");
                                                existingWifiConnection = conn;
                                                break;
                                            }
                                        }

                                        if (existingWifiConnection) {
                                            console.log("Connectiong by ssid...");
                                            client.activate_connection_async(existingWifiConnection, Network.wifi.get_device(), ap.dbus_path, null, (_, asyncRes) => errorNotif(asyncRes, ""))
                                        } else {
                                            console.log("Well, creating a new connection...");
                                            const uuid = NM.utils_uuid_generate();
                                            const ssidBytes = GLib.Bytes.new(encoder.encode(ap.ssid));
 
                                            const Bssid = ap.bssid;
                                            
                                            const connection = NM.SimpleConnection.new();
                                            const connSetting = NM.SettingConnection.new();
                                            const wifiSetting = NM.SettingWireless.new();
                                            const wifiSecuritySetting = NM.SettingWirelessSecurity.new();
                                            const setting8021x = NM.Setting8021x.new();
                                                                                                                                                             
                                            // @ts-ignore yep, type-gen issues again
                                            if(ap.rsnFlags !& NM["80211ApSecurityFlags"].KEY_MGMT_802_1X &&
                                            // @ts-ignore
                                            ap.wpaFlags !& NM["80211ApSecurityFlags"].KEY_MGMT_802_1X) {
                                                return;
                                            }
                                                                                                                                                       
                                            connSetting.uuid = uuid;
                                            connection.add_setting(connSetting);
                                                                                                                                                             
                                            connection.add_setting(wifiSetting);
                                            wifiSetting.ssid = ssidBytes;
                                            
                                            wifiSecuritySetting.keyMgmt = "wpa-eap";
                                            connection.add_setting(wifiSecuritySetting);
                                                                                                                                       
                                            setting8021x.add_eap_method("ttls");
                                            setting8021x.phase2Auth = "mschapv2";
                                            connection.add_setting(setting8021x);                                                                                          
                                            const nmAP = Network.wifi.get_device().accessPoints.filter(nmAccessPoint => nmAccessPoint.ssid === ssidBytes)[0];
                                            const dialog = NMA.WifiDialog.new(
                                                Network.get_client(), connection, 
                                                Network.wifi.get_device(), nmAP, 
                                                false
                                            );
                        
                                            dialog.show();
                                        }
                                    }
                                });
                            })
                        ]
                    ) : [],
                } as Widget.BoxProps)
    ]
});
// For switches
function controlConnection(device: (NM.Device|null), check: boolean): void {
    
    const activeConnection = device.get_active_connection() ?? null;
    
    if (check === true) {
        const availableConnections = device.get_available_connections();
        
        if (availableConnections.length <= 0) {
            return;
        }
        const connection = availableConnections[0];
        client.activate_connection_async(connection, device, null, null, (_, asyncRes) => { 
            try {
                console.log(`Activation ${device.interface} was successful.`);
            } catch (e) {
                console.error(`Activation error: ${e.message}`);
            }
        });
    } else {
        client.deactivate_connection_async(activeConnection, null, (_, asyncRes) => {
            try {
                console.log(`Deactivation ${device.interface} was successful.`);
            } catch (e) {
                console.error(`Deactivation error: ${e.message}`);
            }
        })
    }
}

function activateWirelessConnection(connection: NM.RemoteConnection, ssid: string): void {
    Network.get_client().activate_connection_async(
        connection, Network.wifi.get_device(), null, null, (_, asyncRes) => errorNotif(asyncRes, ssid));
}

function errorNotif(asyncRes: any, ssid: string = ""): void { //change notify for connected and errors scenario
    const activeConnection = Network.get_client().activate_connection_finish(asyncRes);
    if(!activeConnection) {
        Notifications.getDefault().sendNotification({
            appName: "network",
            summary: "Couldn't activate wireless connection",
            body: `An error occurred while activating the wireless connection "${ssid}"`
        });
        return;
    }
}

function notifyConnectionError(ssid: string): void {
    Notifications.getDefault().sendNotification({
        appName: "network",
        summary: "Coudn't connect Wi-Fi",
        body: `An error occurred while trying to connect to the "${ssid}" access point. \nMaybe the password is invalid?`
    });
}
function saveToDisk(remoteConnection: NM.RemoteConnection, ssid: string): void {
    AskPopup({
        text: `Save password for connection "${ssid}"?`,
        acceptText: "Yes",
        onAccept: () => remoteConnection.commit_changes_async(true, null, (_, asyncRes) => 
            !remoteConnection.commit_changes_finish(asyncRes) && Notifications.getDefault().sendNotification({
                appName: "network",
                summary: "Couldn't save Wi-Fi password",
                body: `An error occurred while trying to write the password for "${ssid}" to disk`
        }))
    } as AskPopupProps);
}
