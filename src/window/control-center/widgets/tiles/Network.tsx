import Tile from "../Tile";
import { execAsync } from "ags/process";
import { Accessor, createBinding, createComputed } from "ags";
import { secureBaseBinding } from "../../../../modules/utils";
import AstalNetwork from "gi://AstalNetwork";
import Notifications from "../../../../modules/notifications";
import type Pages from "../pages";


const { WIFI, WIRED } = AstalNetwork.Primary,
    { CONNECTED, CONNECTING, DISCONNECTED } = AstalNetwork.Internet;

const wiredInternet = secureBaseBinding<AstalNetwork.Wired|null>(
    createBinding(AstalNetwork.get_default(), "wired"),
    "internet",
    AstalNetwork.Internet.DISCONNECTED
) as Accessor<AstalNetwork.Internet>;

const wifiInternet = secureBaseBinding<AstalNetwork.Wifi|null>(
    createBinding(AstalNetwork.get_default(), "wifi"),
    "internet",
    AstalNetwork.Internet.DISCONNECTED
) as Accessor<AstalNetwork.Internet>;

const wifiSSID = secureBaseBinding<AstalNetwork.Wifi|null>(
    createBinding(AstalNetwork.get_default(), "wifi"),
    "ssid",
    "Unknown"
) as Accessor<string>;

const wifiIcon = secureBaseBinding<AstalNetwork.Wifi|null>(
    createBinding(AstalNetwork.get_default(), "wifi"),
    "iconName",
    "network-wireless-symbolic"
);

const wiredIcon = secureBaseBinding<AstalNetwork.Wired|null>(
    createBinding(AstalNetwork.get_default(), "wired"),
    "iconName",
    "network-wired-symbolic"
);

const primary = createBinding(AstalNetwork.get_default(), "primary");

export const TileNetwork = (pages: Pages) => 
    <Tile hasArrow title={createComputed(() => {
        switch(primary()) {
            case WIFI:
                if(wifiInternet() === CONNECTED)
                    return wifiSSID();

                return tr("control_center.tiles.network.wireless");

            case WIRED:
                return tr("control_center.tiles.network.wired");
        }

        return tr("control_center.tiles.network.network");
      })}
      onClicked={() => pages.toggle("network")}
      icon={createComputed(() => {
          switch(primary()) {
              case WIFI:
                  return wifiIcon();

              case WIRED:
                  return wiredIcon();
          }

          return "network-wired-no-route-symbolic";
      })}
      state={createComputed(() => {
          const wifiEnabled = createBinding(AstalNetwork.get_default(), "wifi", "enabled")(v => v ?? false);
          const wiredEnabled = wiredInternet(internet => internet === CONNECTED || internet === CONNECTING);

          switch(primary()) {
              case WIFI:
                  return wifiEnabled();

              case WIRED:
                  return wiredEnabled();
          }

          return false;
      })}
      description={createComputed(() => {
          switch(primary()) {
              case WIFI:
                  return internetToTranslatedString(wifiInternet());

              case WIRED:
                  return internetToTranslatedString(wiredInternet());
          }

          return tr("disconnected");        
      })}
      onToggled={(self, state) => {
          const wifi = AstalNetwork.get_default().wifi,
              wired = AstalNetwork.get_default().wired;

          switch(AstalNetwork.get_default().primary) {
              case WIFI:
                  wifi?.set_enabled(state);
                  return;

              case WIRED:
                  setNetworking(state);
                  return;
          }

          if(wired && wired.internet === DISCONNECTED) {
              setNetworking(true);
              return;
          } else if(wifi && !wifi.enabled) {
              wifi.set_enabled(true);
              return;
          }

          // disable if no device available
          self.state = false;
      }}
    />;


function internetToTranslatedString(internet: AstalNetwork.Internet): string {
    switch(internet) {
        case AstalNetwork.Internet.CONNECTED: 
            return tr("connected");
        case AstalNetwork.Internet.CONNECTING:
            return tr("connecting") + "...";
    }

    return tr("disconnected");
}

function setNetworking(state: boolean): void {
    (!state ? 
        execAsync("nmcli n off")
      : execAsync("nmcli n on")
    ).catch(e => {
        Notifications.getDefault().sendNotification({
            appName: "network",
            summary: "Couldn't turn off network",
            body: `Turning off networking with nmcli failed${
                e?.message !== undefined ? `: ${e?.message}` : ""}`
        });
    });
}
