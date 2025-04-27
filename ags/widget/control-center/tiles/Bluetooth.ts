import { bind, Variable } from "astal";
import { Tile, TileProps } from "./Tile";
import AstalBluetooth from "gi://AstalBluetooth";
import { BluetoothPage } from "../pages/Bluetooth";
import { TilesPages } from "../Tiles";


export const TileBluetooth = Tile({
    title: "Bluetooth",
    description: bind(AstalBluetooth.get_default(), "isConnected").as((connected) => {
        const connectedDev = AstalBluetooth.get_default().devices.filter(dev => dev.connected)?.[0];
        return connected && connectedDev ? connectedDev.get_alias() : ""
    }),
    onToggledOn: () => AstalBluetooth.get_default().adapter?.set_powered(true),
    onToggledOff: () => AstalBluetooth.get_default().adapter?.set_powered(false),
    onClickMore: () => TilesPages?.toggle(BluetoothPage()),
    enableOnClickMore: true,
    icon: Variable.derive([
            bind(AstalBluetooth.get_default(), "isPowered"),
            bind(AstalBluetooth.get_default(), "isConnected")
        ],
        (powered: boolean, isConnected: boolean) => 
            powered ? ( isConnected ? "󰂱" : "󰂯" ) : "󰂲"
    )(),
    iconSize: 16,
    toggleState: bind(AstalBluetooth.get_default(), "isPowered")
} as TileProps);
