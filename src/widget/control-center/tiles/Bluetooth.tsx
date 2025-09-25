import { Tile } from "./Tile";
import AstalBluetooth from "gi://AstalBluetooth";
import { BluetoothPage } from "../pages/Bluetooth";
import { TilesPages } from "../Tiles";
import { createBinding, createComputed } from "ags";
import { Bluetooth } from "../../../modules/bluetooth";


export const TileBluetooth = () => 
    <Tile title={"Bluetooth"} visible={
        createBinding(Bluetooth.getDefault(), "adapter").as(Boolean)
      } description={createBinding(AstalBluetooth.get_default(), "isConnected").as((connected) => {
          if(!connected) return "";

          const connectedDevs = AstalBluetooth.get_default().devices.filter(dev => dev.connected);
          const connectedDev = connectedDevs[connectedDevs.length - 1]; // last connected device is on display
          return connectedDev ? connectedDev.get_alias() : ""
      })} 
      onEnabled={() => Bluetooth.getDefault().adapter?.set_powered(true)}
      onDisabled={() => Bluetooth.getDefault().adapter?.set_powered(false)}
      onClicked={() => TilesPages?.toggle(BluetoothPage)}
      enableOnClicked hasArrow
      state={createBinding(AstalBluetooth.get_default(), "isPowered")}
      icon={createComputed([
            createBinding(AstalBluetooth.get_default(), "isPowered"),
            createBinding(AstalBluetooth.get_default(), "isConnected")
        ],
        (powered: boolean, isConnected: boolean) => 
            powered ? ( isConnected ? 
                    "bluetooth-active-symbolic"
                : "bluetooth-symbolic"
            ) : "bluetooth-disabled-symbolic")
      }
    />;
