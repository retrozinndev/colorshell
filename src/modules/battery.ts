import { Accessor, createBinding } from "ags";
import AstalBattery from "gi://AstalBattery?version=0.1";

export class Battery {
  private static astalBattery: AstalBattery.Device = AstalBattery.get_default();

  private static batteryInst: Battery;

  constructor() {
    AstalBattery.get_default();
  }

  public static getDefault(): Battery {
    if (!this.batteryInst) {
      this.batteryInst = new Battery();
    }

    return this.batteryInst;
  }

  public static getBattery(): AstalBattery.Device {
    return this.astalBattery;
  }

  public bindHasBattery(): Accessor<boolean> {
    return createBinding(Battery.getBattery(), "isBattery");
  }

  public bindPercentage(): Accessor<string> {
    return createBinding(Battery.getBattery(), "percentage").as(
      (v) => Math.round(v * 100) + "%"
    );
  }

  public bindIcon(): Accessor<string> {
    return createBinding(Battery.getBattery(), "battery_icon_name");
  }
}
