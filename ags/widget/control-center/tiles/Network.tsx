import { execAsync } from "ags/process";
import { Tile } from "./Tile";
import AstalNetwork from "gi://AstalNetwork";
import { PageNetwork } from "../pages/Network";
import { tr } from "../../../i18n/intl";
import { TilesPages } from "../Tiles";
import { Gtk } from "ags/gtk4";
import { createBinding, createComputed, With } from "ags";

export const TileNetwork = () => <Gtk.Box>
    <With value={createComputed([
        createBinding(AstalNetwork.get_default(), "primary"), 
        createBinding(AstalNetwork.get_default(), "wired"), 
        createBinding(AstalNetwork.get_default(), "wifi")
    ])}>

        {([primary, wired, wifi]: [AstalNetwork.Primary, AstalNetwork.Wired, AstalNetwork.Wifi]) => {
            if(primary === AstalNetwork.Primary.WIFI) {
                return <Tile title={tr("control_center.tiles.network.wireless")}
                    description={createComputed([
                        createBinding(wifi, "ssid"), createBinding(wifi, "internet")
                    ], (ssid, internet) => ssid ? ssid : (() => {
                            switch(internet) {
                                case AstalNetwork.Internet.CONNECTED: 
                                    return tr("connected");
                                case AstalNetwork.Internet.DISCONNECTED:
                                    return tr("disconnected");
                                case AstalNetwork.Internet.CONNECTING:
                                    return tr("connecting") + "...";
                            }
                        })()
                    )} onToggledOn={() => wifi.set_enabled(true)}
                    onToggledOff={() => wifi.set_enabled(false)}
                    onClickMore={() => TilesPages?.toggle(PageNetwork())}
                    icon={"network-wireless-signal-excellent-symbolic"}
                    toggleState={createBinding(wifi, "enabled")}
                />

            } else if(primary === AstalNetwork.Primary.WIRED) {
                return <Tile title={tr("control_center.tiles.network.wired")}
                    description={createBinding(wired, "internet").as((internet: AstalNetwork.Internet) => {
                        switch(internet) {
                            case AstalNetwork.Internet.CONNECTED: 
                                return tr("connected");
                            case AstalNetwork.Internet.DISCONNECTED:
                                return tr("disconnected");
                            case AstalNetwork.Internet.CONNECTING:
                                return tr("connecting") + "...";
                        }
                    })}
                    onToggledOn={() => execAsync("nmcli n on")}
                    onToggledOff={() => execAsync("nmcli n off")}
                    onClickMore={() => TilesPages?.toggle(PageNetwork())}
                    icon={createBinding(wired, "internet").as((internet: AstalNetwork.Internet) => {
                        switch(internet) {
                            case AstalNetwork.Internet.CONNECTED: 
                                return "network-wired-symbolic";
                            case AstalNetwork.Internet.DISCONNECTED:
                                return "network-wired-disconnected-symbolic";
                        }

                        return "network-wired-no-route-symbolic";
                    })}
                    iconSize={16}
                    toggleState={createBinding(wired, "internet").as((internet: AstalNetwork.Internet) => 
                        internet === AstalNetwork.Internet.CONNECTING 
                            || internet === AstalNetwork.Internet.CONNECTED
                    )}
                />
            }
            
            return <Tile
                title={tr("control_center.tiles.network.network")}
                description={tr("disconnected")}
                onToggledOn={() => execAsync("nmcli n on")}
                onToggledOff={() => execAsync("nmcli n off")}
                onClickMore={() => TilesPages?.toggle(PageNetwork())}
                icon={"network-wired-disconnected-symbolic"}
                iconSize={16}
                toggleState={createBinding(wired, "internet").as((internet: AstalNetwork.Internet) => 
                    internet === AstalNetwork.Internet.CONNECTING || internet === AstalNetwork.Internet.CONNECTED)}
            />
        }}
    </With>
</Gtk.Box> as Gtk.Box;
