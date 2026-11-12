import { createBinding, createComputed } from "ags";
import { secureBaseBinding } from "../../../../modules/utils";
import Bluetooth from "../../../../modules/bluetooth";
import AstalBluetooth from "gi://AstalBluetooth";
import Tile from "../Tile";
import type Pages from "../pages";


export const TileBluetooth = (pages: Pages) => 
    <Tile title={createBinding(Bluetooth.getDefault(), "lastDevice").as(dev =>
          dev?.alias ?? "Bluetooth"
      )} visible={createBinding(Bluetooth.getDefault(), "isAvailable")}
      description={secureBaseBinding<typeof Bluetooth.prototype.lastDevice>(
          createBinding(Bluetooth.getDefault(), "lastDevice"), 
          "batteryPercentage", 
          null
      )(bat => bat !== null && bat > 0 ? 
          `${tr("battery")}: ${Math.floor(bat*100)}%`
      : (bat !== null ? tr("connected") : ""))} 
      onEnabled={() => Bluetooth.getDefault().adapter?.set_powered(true)}
      onDisabled={() => Bluetooth.getDefault().adapter?.set_powered(false)}
      onClicked={() => pages.toggle("bluetooth")}
      hasArrow
      state={createBinding(AstalBluetooth.get_default(), "isPowered")}
      icon={createComputed(() => {
            const powered = createBinding(AstalBluetooth.get_default(), "isPowered")(),
                connected = createBinding(AstalBluetooth.get_default(), "isConnected")();

            return powered ?
                connected ? 
                    "bluetooth-active-symbolic"
                : "bluetooth-symbolic"
            : "bluetooth-disabled-symbolic"
      })}
    />;
