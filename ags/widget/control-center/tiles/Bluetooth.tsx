import { Tile } from "./Tile";
import AstalBluetooth from "gi://AstalBluetooth";
import { BluetoothPage } from "../pages/Bluetooth";
import { TilesPages } from "../Tiles";
import { createBinding, createComputed } from "ags";


export const TileBluetooth = () => 
    <Tile title={"Bluetooth"} visible={
            createBinding(AstalBluetooth.get_default(), "adapter").as(Boolean)
        } description={createBinding(AstalBluetooth.get_default(), "isConnected").as((connected) => {
            const connectedDev = AstalBluetooth.get_default().devices.filter(dev => dev.connected)?.[0];
            return connected && connectedDev ? connectedDev.get_alias() : ""
        })} onToggledOn={() => AstalBluetooth.get_default().adapter?.set_powered(true)}
        onToggledOff={() => AstalBluetooth.get_default().adapter?.set_powered(false)}
        onClickMore={() => TilesPages?.toggle(BluetoothPage())}
        enableOnClickMore={true} iconSize={16}
        toggleState={createBinding(AstalBluetooth.get_default(), "isPowered")}
        icon={createComputed([
            createBinding(AstalBluetooth.get_default(), "isPowered"),
            createBinding(AstalBluetooth.get_default(), "isConnected")
        ],
        (powered: boolean, isConnected: boolean) => 
            powered ? ( isConnected ? 
                    "bluetooth-active-symbolic"
                : "bluetooth-symbolic"
            ) : "bluetooth-disabled-symbolic")}
    />;
