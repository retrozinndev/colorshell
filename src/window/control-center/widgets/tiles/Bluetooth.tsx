import { Tile } from "./Tile";
import { BluetoothPage } from "../pages/Bluetooth";
import { TilesPages } from "../tiles";
import { createBinding, createComputed } from "ags";
import { Bluetooth } from "../../../../modules/bluetooth";

import AstalBluetooth from "gi://AstalBluetooth";


export const TileBluetooth = () => 
    <Tile title={"Bluetooth"} visible={createBinding(Bluetooth.getDefault(), "isAvailable")}
      description={createComputed([
          createBinding(Bluetooth.getDefault(), "adapter"),
          createBinding(AstalBluetooth.get_default(), "devices")
      ], (adapter, devices) => {
          const lastConnectedDevice = devices.filter(d => d.connected)[devices.length - 1];

          if(!adapter || !lastConnectedDevice) 
              return "";

          return lastConnectedDevice.alias;
      })} 
      onEnabled={() => Bluetooth.getDefault().adapter?.set_powered(true)}
      onDisabled={() => Bluetooth.getDefault().adapter?.set_powered(false)}
      onClicked={() => TilesPages?.toggle(BluetoothPage)}
      hasArrow
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
