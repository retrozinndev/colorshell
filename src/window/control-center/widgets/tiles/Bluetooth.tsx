import { Tile } from "./Tile";
import { BluetoothPage } from "../pages/Bluetooth";
import { TilesPages } from "../tiles";
import { createBinding, createComputed } from "ags";
import { Bluetooth } from "../../../../modules/bluetooth";

import AstalBluetooth from "gi://AstalBluetooth";
import { secureBaseBinding } from "../../../../modules/utils";
import { tr } from "../../../../i18n/intl";


export const TileBluetooth = () => 
    <Tile title={createBinding(Bluetooth.getDefault(), "lastDevice").as(dev =>
          dev?.alias ?? "Bluetooth"
      )} visible={createBinding(Bluetooth.getDefault(), "isAvailable")}
      description={secureBaseBinding<typeof Bluetooth.prototype.lastDevice>(
          createBinding(Bluetooth.getDefault(), "lastDevice"), 
          "batteryPercentage", 
          null
      ).as(bat => bat !== null && bat > 0 ? 
          `${tr("battery")}: ${Math.floor(bat*100)}%`
      : (bat !== null ? tr("connected") : ""))} 
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
