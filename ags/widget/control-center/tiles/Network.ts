import { bind, execAsync, Variable } from "astal";
import { Tile, TileProps } from "./Tile";
import AstalNetwork from "gi://AstalNetwork";
import { Widget } from "astal/gtk3";
import { togglePage } from "../Pages";
import { PageNetwork } from "../pages/Network";
import { tr } from "../../../i18n/intl";

export const TileNetwork = new Widget.Box({
    child: Variable.derive([
            bind(AstalNetwork.get_default(), "primary"), 
            bind(AstalNetwork.get_default(), "wired"), 
            bind(AstalNetwork.get_default(), "wifi")
        ],
        (primary: AstalNetwork.Primary, wired: AstalNetwork.Wired, wifi: AstalNetwork.Wifi) => {
            if(primary === AstalNetwork.Primary.WIFI) {
                return Tile({
                    title: tr("control_center.tiles.network.wireless") || "Wireless",
                    description: Variable.derive(
                        [ bind(wifi, "ssid"), bind(wifi, "internet") ],
                        (ssid: string, internet: AstalNetwork.Internet) =>
                        ssid ? ssid : (() => {
                            switch(internet) {
                                case AstalNetwork.Internet.CONNECTED: 
                                    return tr("control_center.tiles.network.connected") || "Connected";
                                case AstalNetwork.Internet.DISCONNECTED:
                                    return tr("control_center.tiles.network.disconnected") || "Disconnected";
                                case AstalNetwork.Internet.CONNECTING:
                                    return tr("control_center.tiles.network.connecting") + "..." || "Connecting...";
                            }
                        })()
                    )(),
                    onToggledOn: () => wifi.set_enabled(true),
                    onToggledOff: () => wifi.set_enabled(false),
                    onClickMore: () => togglePage(PageNetwork),
                    icon: "󰤨",
                    iconSize: 16,
                    toggleState: bind(wifi, "enabled")
                } as TileProps);

            } else if(primary === AstalNetwork.Primary.WIRED) {
                return Tile({
                    title: tr("control_center.tiles.network.wired") || "Wired",
                    description: bind(wired, "internet").as((internet: AstalNetwork.Internet) => {
                        switch(internet) {
                            case AstalNetwork.Internet.CONNECTED: 
                                return tr("control_center.tiles.network.connected") || "Connected";
                            case AstalNetwork.Internet.DISCONNECTED:
                                return tr("control_center.tiles.network.disconnected") || "Disconnected";
                            case AstalNetwork.Internet.CONNECTING:
                                return tr("control_center.tiles.network.connecting") + "..." || "Connecting...";
                        }
                    }),
                    onToggledOn: () => execAsync("nmcli n on"),
                    onToggledOff: () => execAsync("nmcli n off"),
                    onClickMore: () => togglePage(PageNetwork),
                    icon: bind(wired, "internet").as((internet: AstalNetwork.Internet) => {
                        switch(internet) {
                            case AstalNetwork.Internet.CONNECTED: 
                                return '󰛳';
                            case AstalNetwork.Internet.DISCONNECTED:
                                return '󰲛';
                        }

                        return "󰛵";
                    }),
                    iconSize: 16,
                    toggleState: bind(wired, "internet").as((internet: AstalNetwork.Internet) => 
                        internet === AstalNetwork.Internet.CONNECTING 
                            || internet === AstalNetwork.Internet.CONNECTED
                    )
                } as TileProps);
            }
            
            return Tile({
                title: tr("control_center.tiles.network.network") || "Network",
                description: tr("control_center.tiles.network.disconnected") || "Disconnected",
                onToggledOn: () => execAsync("nmcli n on"),
                onToggledOff: () => execAsync("nmcli n off"),
                onClickMore: () => togglePage(PageNetwork),
                icon: "󰲛",
                iconSize: 16,
                toggleState: bind(wired, "internet").as((internet: AstalNetwork.Internet) => 
                    internet === AstalNetwork.Internet.CONNECTING || internet === AstalNetwork.Internet.CONNECTED)
            } as TileProps);
        })()
} as Widget.BoxProps);
