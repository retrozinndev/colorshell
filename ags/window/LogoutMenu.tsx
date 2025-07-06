import { Astal, Gdk, Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { AskPopup, AskPopupProps } from "../widget/AskPopup";
import { Windows } from "../windows";
import { Notifications } from "../scripts/notifications";
import { NightLight } from "../scripts/nightlight";
import { Config } from "../scripts/config";

import AstalNotifd from "gi://AstalNotifd";
import Gio from "gi://Gio?version=2.0";
import GObject from "gi://GObject?version=2.0";
import { time } from "../scripts/utils";


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export const LogoutMenu = (mon: number) => 
    <Astal.Window namespace={"logout-menu"} anchor={TOP | LEFT | RIGHT | BOTTOM}
      layer={Astal.Layer.OVERLAY} exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE} monitor={mon} $={(self) => {
          const conns: Map<GObject.Object, number> = new Map();
          const controllerKey = Gtk.EventControllerKey.new();

          self.add_controller(controllerKey);
          conns.set(controllerKey, controllerKey.connect("key-released", (_, keyval) => {
              if(keyval === Gdk.KEY_Escape)
                  self.close();
          }));
          conns.set(self, self.connect("destroy", () => conns.forEach((id, obj) =>
              obj.disconnect(id))));
      }}>

        <Gtk.Box class={"logout-menu"} orientation={Gtk.Orientation.VERTICAL} 
          $={(self) => {
              const conns: Map<GObject.Object, number> = new Map();
              const gestureClick = Gtk.GestureClick.new();
              
              self.add_controller(gestureClick);

              conns.set(gestureClick, gestureClick.connect("released", (gesture) => {
                  if(gesture.get_current_button() === Gdk.BUTTON_PRIMARY) {
                      Windows.getDefault().close("logout-menu");
                      return true;
                  }
              }));
          }}>
            
            <Gtk.Box class={"top"} hexpand={true} vexpand={false} 
              orientation={Gtk.Orientation.VERTICAL}>

                <Gtk.Label class={"time"} label={time(t => t.format("%H:%M")!)} />
                <Gtk.Label class={"date"} label={time(d => d.format("%A, %B %d %Y")!)} />
            </Gtk.Box>

            <Gtk.Box class={"button-row"} homogeneous={true} heightRequest={360}>
                <Gtk.Button class={"poweroff"} iconName={"system-shutdown-symbolic"}
                  onClicked={() => AskPopup(poweroffAsk)} onActivate={() => 
                      AskPopup(poweroffAsk)}
                />
                <Gtk.Button class={"reboot"} iconName={"arrow-circular-top-right-symbolic"}
                  onClicked={() => AskPopup(rebootAsk)} onActivate={() => AskPopup(rebootAsk)}
                />
                <Gtk.Button class={"suspend"} iconName={"weather-clear-night-symbolic"}
                  onClicked={() => AskPopup(suspendAsk)} onActivate={() => AskPopup(suspendAsk)}
                />
                <Gtk.Button class={"logout"} iconName={"system-log-out-symbolic"}
                  onClicked={() => AskPopup(logoutAsk)} onActivate={() => AskPopup(logoutAsk)}
                />
            </Gtk.Box>
        </Gtk.Box>
    </Astal.Window> as Astal.Window;

const logoutAsk: AskPopupProps = {
    title: "Log out",
    text: "Are you sure you want to log out? Your session will be ended.",
    onAccept: () => {
        Config.getDefault().getProperty("night_light.save_on_shutdown", "boolean") && 
            NightLight.getDefault().saveData();

        execAsync(`hyprctl dispatch exit`).catch((err: Gio.IOErrorEnum) => 
            Notifications.getDefault().sendNotification({
                appName: "colorshell",
                summary: "Couldn't exit Hyprland",
                body: `An error occurred and colorshell couldn't exit Hyprland. Stderr: \n${
                    err.message ? `${err.message}\n` : ""}${err.stack}`,
                urgency: AstalNotifd.Urgency.NORMAL,
                actions: [{
                    text: "Report Issue on colorshell",
                    onAction: () => execAsync(
                        `xdg-open https://github.com/retrozinndev/colorshell/issues/new`
                    ).catch((err: Gio.IOErrorEnum) => 
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't open link",
                            body: `Do you have \`xdg-utils\` installed? Stderr: \n${
                                err.message ? `${err.message}\n` : ""}${err.stack}`
                        })
                    )
                }]
            })
        )
    }
};

const suspendAsk: AskPopupProps = {
    title: "Suspend",
    text: "Are you sure you want to Suspend?",
    onAccept: () => execAsync("systemctl suspend")
};

const rebootAsk: AskPopupProps = {
    title: "Reboot",
    text: "Are you sure you want to Reboot? Unsaved work will be lost.",
    onAccept: () => {
        Config.getDefault().getProperty("night_light.save_on_shutdown", "boolean") && 
            NightLight.getDefault().saveData();

        execAsync("systemctl reboot");
    }
};

const poweroffAsk: AskPopupProps = {
    title: "Power Off",
    text: "Are you sure you want to power off? Unsaved work will be lost.",
    onAccept: () => {
        Config.getDefault().getProperty("night_light.save_on_shutdown", "boolean") && 
            NightLight.getDefault().saveData();

        execAsync("systemctl poweroff");
    }
};
