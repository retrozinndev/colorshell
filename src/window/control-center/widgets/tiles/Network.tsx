import { Tile } from "./Tile";
import { execAsync } from "ags/process";
import { PageNetwork } from "../pages/Network";
import { tr } from "../../../../i18n/intl";
import { TilesPages } from "../tiles";
import { Accessor, createBinding, createComputed } from "ags";
import { secureBaseBinding } from "../../../../modules/utils";

import AstalNetwork from "gi://AstalNetwork";
import { Notifications } from "../../../../modules/notifications";


const { WIFI, WIRED } = AstalNetwork.Primary,
    { CONNECTED, CONNECTING, DISCONNECTED } = AstalNetwork.Internet;

const wiredInternet = secureBaseBinding<AstalNetwork.Wired>(
    createBinding(AstalNetwork.get_default(), "wired"),
    "internet",
    AstalNetwork.Internet.DISCONNECTED
) as Accessor<AstalNetwork.Internet>;

const wifiInternet = secureBaseBinding<AstalNetwork.Wifi>(
    createBinding(AstalNetwork.get_default(), "wifi"),
    "internet",
    AstalNetwork.Internet.DISCONNECTED
) as Accessor<AstalNetwork.Internet>;

const wifiSSID = secureBaseBinding<AstalNetwork.Wifi>(
    createBinding(AstalNetwork.get_default(), "wifi"),
    "ssid",
    "Unknown"
) as Accessor<string>;

const wifiIcon = secureBaseBinding<AstalNetwork.Wifi>(
    createBinding(AstalNetwork.get_default(), "wifi"),
    "iconName",
    "network-wireless-symbolic"
);

const wiredIcon = secureBaseBinding<AstalNetwork.Wired>(
    createBinding(AstalNetwork.get_default(), "wired"),
    "iconName",
    "network-wired-symbolic"
);

const primary = createBinding(AstalNetwork.get_default(), "primary");

export const TileNetwork = () => 
    <Tile hasArrow title={createComputed([
          primary, 
          wifiInternet, 
          wifiSSID
      ], (primary, wiInternet, wiSSID) => {
        switch(primary) {
            case WIFI:
                if(wiInternet === CONNECTED)
                    return wiSSID;

                return tr("control_center.tiles.network.wireless");

            case WIRED:
                return tr("control_center.tiles.network.wired");
        }

        return tr("control_center.tiles.network.network");
      })}
      onClicked={() => TilesPages?.toggle(PageNetwork)}
      icon={createComputed([
          primary,
          wifiIcon,
          wiredIcon
      ], (primary, wifiIcon, wiredIcon) => {
          switch(primary) {
              case WIFI:
                  return wifiIcon;

              case WIRED:
                  return wiredIcon;
          }

          return "network-wired-no-route-symbolic";
      })}
      state={createComputed([
          primary,
          secureBaseBinding<AstalNetwork.Wifi>(
              createBinding(AstalNetwork.get_default(), "wifi"),
              "enabled",
              false
          ),
          wiredInternet.as(internet => internet === CONNECTED || internet === CONNECTING)
      ], (primary, wifiEnabled, wiredEnabled) => {
          switch(primary) {
              case WIFI:
                  return wifiEnabled;

              case WIRED:
                  return wiredEnabled;
          }

          return false;
      })}
      description={createComputed([
          primary,
          wifiInternet,
          wiredInternet
      ], (primary, wifiInternet, wiredInternet) => {
          switch(primary) {
              case WIFI:
                  return internetToTranslatedString(wifiInternet);

              case WIRED:
                  return internetToTranslatedString(wiredInternet);
          }

          return tr("disconnected");        
      })}
      onToggled={(self, state) => {
          const wifi = AstalNetwork.get_default().wifi,
              wired = AstalNetwork.get_default().wired;

          switch(AstalNetwork.get_default().primary) {
              case WIFI:
                  wifi.set_enabled(state);
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
