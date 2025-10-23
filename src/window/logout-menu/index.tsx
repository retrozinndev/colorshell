import { Astal, Gdk, Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";
import { generalConfig } from "../../config";
import { AskPopup } from "../../widget/AskPopup";
import { Notifications } from "../../modules/notifications";
import { NightLight } from "../../modules/nightlight";
import { time } from "../../modules/utils";

import GObject from "ags/gobject";
import AstalNotifd from "gi://AstalNotifd";
import Gio from "gi://Gio?version=2.0";


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

          conns.set(self, self.connect("close-request", () => conns.forEach((id, obj) =>
              obj.disconnect(id))));
      }}>

        <Gtk.Box class={"logout-menu-container"} orientation={Gtk.Orientation.VERTICAL} 
          $={(self) => {
              const conns: Map<GObject.Object, number> = new Map();
              const gestureClick = Gtk.GestureClick.new();
              
              self.add_controller(gestureClick);
              gestureClick.set_button(0);

              conns.set(gestureClick, gestureClick.connect("released", (gesture) => {
                  if(gesture.get_current_button() === Gdk.BUTTON_PRIMARY) {
                      (self.get_root() as Astal.Window|null)?.close();
                      return true;
                  }
              }));

              conns.set(self, self.connect("destroy", () => conns.forEach((id, obj) =>
                  obj.disconnect(id))));
          }}>
            
            <Gtk.Box class={"top"} hexpand vexpand={false} 
              orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.START}>

                <Gtk.Label class={"time"} label={time(t => t.format("%H:%M")!)} />
                <Gtk.Label class={"date"} label={time(d => d.format("%A, %B %d %Y")!)} />
            </Gtk.Box>

            <Gtk.Box class={"button-row"} homogeneous heightRequest={360} valign={Gtk.Align.CENTER}
              vexpand>
                <Gtk.Button class={"poweroff"} iconName={"system-shutdown-symbolic"}
                  onClicked={() => AskPopup({
                      title: "Power Off",
                      text: "Are you sure you want to power off? Unsaved work will be lost.",
                      onAccept: () => {
                          generalConfig.getProperty("night_light.save_on_shutdown", "boolean") && 
                              NightLight.getDefault().saveData();

                          execAsync("systemctl poweroff");
                      }
                  })}
                />
                <Gtk.Button class={"reboot"} iconName={"arrow-circular-top-right-symbolic"}
                  onClicked={() => AskPopup({
                      title: "Reboot",
                      text: "Are you sure you want to Reboot? Unsaved work will be lost.",
                      onAccept: () => {
                          generalConfig.getProperty("night_light.save_on_shutdown", "boolean") && 
                              NightLight.getDefault().saveData();

                          execAsync("systemctl reboot");
                      }
                  })}
                />
                <Gtk.Button class={"suspend"} iconName={"weather-clear-night-symbolic"}
                  onClicked={() => AskPopup({
                      title: "Suspend",
                      text: "Are you sure you want to Suspend?",
                      onAccept: () => execAsync("systemctl suspend")
                  })}
                />
                <Gtk.Button class={"logout"} iconName={"system-log-out-symbolic"}
                  onClicked={() => AskPopup({
                      title: "Log out",
                      text: "Are you sure you want to log out? Your session will be ended.",
                      onAccept: () => {
                          generalConfig.getProperty("night_light.save_on_shutdown", "boolean") && 
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
                  })}
                />
            </Gtk.Box>
        </Gtk.Box>
    </Astal.Window> as Astal.Window;
