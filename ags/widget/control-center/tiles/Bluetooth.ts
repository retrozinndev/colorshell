import { bind, Variable } from "astal";
import { Tile, TileProps } from "./Tile";
import AstalBluetooth from "gi://AstalBluetooth";
import { togglePage } from "../Pages";
import { BluetoothPage } from "../pages/Bluetooth";

export const TileBluetooth = Tile({
    title: "Bluetooth",
    description: bind(AstalBluetooth.get_default(), "isConnected").as((connected) => {
        const connectedDev = AstalBluetooth.get_default().devices.filter(dev => dev.connected)?.[0];
        return connected && connectedDev ? connectedDev.get_alias() : ""
    }),
    onToggledOn: () => AstalBluetooth.get_default().adapter.set_powered(true),
    onToggledOff: () => AstalBluetooth.get_default().adapter.set_powered(false),
    onClickMore: () => togglePage(BluetoothPage),
    icon: Variable.derive([
            bind(AstalBluetooth.get_default().adapter, "powered"),
            bind(AstalBluetooth.get_default(), "isConnected")
        ],
        (powered: boolean, isConnected: boolean) => 
            powered ? ( isConnected ? "󰂱" : "󰂯" ) : "󰂲"
    )(),
    iconSize: 16,
    toggleState: bind(AstalBluetooth.get_default().adapter, "powered")
} as TileProps);
