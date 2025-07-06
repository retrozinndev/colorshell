import { Gtk } from "ags/gtk4";
import { Page, PageButton } from "./Page";
import { Windows } from "../../../windows";
import { tr } from "../../../i18n/intl";
import { execApp } from "../../../scripts/apps";
import { Notifications } from "../../../scripts/notifications";
import { AskPopup, AskPopupProps } from "../../AskPopup";
import { encoder, variableToBoolean } from "../../../scripts/utils";

import GLib from "gi://GLib?version=2.0";
import NM from "gi://NM";
import AstalNetwork from "gi://AstalNetwork";
import { createBinding, For, With } from "ags";


export const PageNetwork = () => 
    <Page id={"network"} title={tr("control_center.pages.network.title")}
      class={"network"} headerButtons={[
          <Gtk.Button class={"reload"} iconName={"arrow-circular-top-right-symbolic"}
            visible={createBinding(AstalNetwork.get_default(), "primary").as(primary =>
                primary === AstalNetwork.Primary.WIFI)}
            tooltipText={"Re-scan networks"} onClicked={() => 
                AstalNetwork.get_default().wifi.scan()}
          />
      ]} bottomButtons={[{
          title: tr("control_center.pages.more_settings"),
          onClick: () => {
              Windows.getDefault().close("control-center");
              execApp("nm-connection-editor", "[animationstyle gnomed]");
          }
      }]}>

        <Gtk.Box class={"devices"} hexpand={true} orientation={Gtk.Orientation.VERTICAL}
          visible={variableToBoolean(createBinding(AstalNetwork.get_default().client, "devices"))}>

            <Gtk.Label label={tr("devices")} xalign={0} class={"sub-header"} />
            <For each={createBinding(AstalNetwork.get_default().client, "devices").as(devs => 
              devs.filter(dev => dev.interface !== "lo" && dev.real /* filter local device */))}>

                {(device: NM.Device) => <PageButton title={createBinding(device, "interface").as(iface =>
                    iface ?? tr("control_center.pages.network.interface"))} class={"device"}
                  icon={createBinding(device, "deviceType").as(type => type === NM.DeviceType.WIFI ?
                    "network-wireless-symbolic" : "network-wired-symbolic")} extraButtons={[

                      <Gtk.Button iconName={"view-more-symbolic"} onClicked={() => {
                          Windows.getDefault().close("control-center");
                          execApp(
                              `nm-connection-editor --edit ${device.activeConnection?.connection.get_uuid()}`,
                              "[animationstyle gnomed; float]"
                          );
                      }} />
                  ]}
                />}
            </For>
        </Gtk.Box>

        <With value={createBinding(AstalNetwork.get_default(), "primary").as(primary => 
          primary === AstalNetwork.Primary.WIFI)}>

            {(isWifi: boolean) => isWifi && <Gtk.Box class={"wireless-aps"} hexpand={true} 
              orientation={Gtk.Orientation.VERTICAL}>

                <Gtk.Label class={"sub-header"} label={"Wi-Fi"} />
                <For each={createBinding(AstalNetwork.get_default().wifi, "accessPoints")}>
                    {(ap: AstalNetwork.AccessPoint) => <PageButton class={
                        createBinding(AstalNetwork.get_default().wifi, "activeAccessPoint").as(activeAP =>
                            activeAP.ssid === ap.ssid ? "active" : "")
                      } title={createBinding(ap, "ssid").as(ssid => ssid ?? "No SSID")}
                      icon={createBinding(ap, "iconName")} endWidget={<Gtk.Image iconName={
                          createBinding(ap, "flags").as(flags => 
                            // @ts-ignore
                            flags & NM["80211ApFlags"].PRIVACY ?
                                "channel-secure-symbolic"
                            : "channel-insecure-symbolic")}
                          css={"font-size: 18px;"}
                      />} extraButtons={[
                          <Gtk.Button iconName={"window-close-symbolic"} visible={
                              createBinding(AstalNetwork.get_default().wifi, "activeAccessPoint").as(activeAp =>
                                  activeAp.ssid === ap.ssid)
                          } css={"font-size: 18px;"} onClicked={() => {
                                const active = AstalNetwork.get_default().wifi.activeAccessPoint;

                                if(active?.ssid === ap.ssid) {
                                    AstalNetwork.get_default().wifi.deactivate_connection((_, res) => {
                                        try { 
                                            AstalNetwork.get_default().wifi.deactivate_connection_finish(res);
                                        } catch(e: any) {
                                            e = e as Error;

                                            console.error(
                                                `Network: couldn't deactivate connection with access point(SSID: ${
                                                    ap.ssid}. Stderr: \n${e.message}\n${e.stack}`
                                            );
                                        }
                                    })
                                }
                            }}/>
                      ]} onClick={() => {
                          const uuid = NM.utils_uuid_generate();
                          const ssidBytes = GLib.Bytes.new(encoder.encode(ap.ssid));

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
                      }}
                    />}
                </For>
            </Gtk.Box>}
        </With>
    </Page> as Page;

function activateWirelessConnection(connection: NM.RemoteConnection, ssid: string): void {
    AstalNetwork.get_default().get_client().activate_connection_async(
        connection, AstalNetwork.get_default().wifi.get_device(), null, null, (_, asyncRes) => {
            const activeConnection = AstalNetwork.get_default().get_client().activate_connection_finish(asyncRes);
            if(!activeConnection) {
                Notifications.getDefault().sendNotification({
                    appName: "network",
                    summary: "Couldn't activate wireless connection",
                    body: `An error occurred while activating the wireless connection "${ssid}"`
                });
                return;
            }
        }
    );
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
