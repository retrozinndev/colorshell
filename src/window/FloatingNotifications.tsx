import { Astal, Gtk } from "ags/gtk4";
import { createBinding, createComputed, For } from "ags";
import { Notifications } from "../modules/notifications";
import { NotificationWidget } from "../widget/Notification";
import { generalConfig } from "../app";

import AstalNotifd from "gi://AstalNotifd";
import Adw from "gi://Adw?version=1";

const size = 450;

export const FloatingNotifications = (mon: number) => 
    <Astal.Window namespace={"floating-notifications"} monitor={mon} layer={Astal.Layer.OVERLAY}
      anchor={createComputed([
          generalConfig.bindProperty("notifications.position_h", "string"),
          generalConfig.bindProperty("notifications.position_v", "string")
      ]).as(([posH, posV]) => {
          let horizontal: Astal.WindowAnchor = Astal.WindowAnchor.RIGHT,
            vertical: Astal.WindowAnchor = Astal.WindowAnchor.TOP;

          switch(posH) {
              case "left":
                  horizontal = Astal.WindowAnchor.LEFT;
              break;
              case "center":
                  horizontal = Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT;
              break;
              case "right":
                  horizontal = Astal.WindowAnchor.RIGHT;
              break;
          }

          switch(posV) {
              case "top":
                  vertical = Astal.WindowAnchor.TOP;
              break;
              case "center":
                  vertical = Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM;
              break;
              case "bottom":
                  vertical = Astal.WindowAnchor.BOTTOM;
              break;
          }

          return horizontal | vertical;

      })} exclusivity={Astal.Exclusivity.NORMAL}
      resizable={false} widthRequest={450}>

        <Gtk.Box class={"floating-notifications-container"} spacing={12}
          orientation={Gtk.Orientation.VERTICAL}>

            <For each={createBinding(Notifications.getDefault(), "notifications")}>
                {(notif: AstalNotifd.Notification) => 
                    <Gtk.Stack transitionType={createComputed([
                          generalConfig.bindProperty("notifications.position_h", "string"),
                          generalConfig.bindProperty("notifications.position_v", "string")
                      ]).as(([posH, posV]) => {
                          //TODO: support different animations depending on screen position
                          return Gtk.StackTransitionType.SLIDE_RIGHT
                      })} transitionDuration={300}>
                        <Gtk.StackPage name={"notification"} child={
                            <Adw.Clamp maximumSize={size}>
                                <Gtk.Box class={"float-notification"} widthRequest={size} vexpand={false}
                                  valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>

                                    <NotificationWidget notification={notif} showTime={false}
                                      actionClose={() => Notifications.getDefault().removeNotification(notif)}
                                      holdOnHover actionClicked={() => {
                                          const viewAction = notif.actions.filter(a => 
                                              a.id.toLowerCase() === "view" || 
                                                  a.label.toLowerCase() === "view"
                                          )?.[0];

                                          viewAction && notif.invoke(viewAction.id);
                                      }}
                                    />
                                </Gtk.Box>
                            </Adw.Clamp> as Gtk.Widget
                        }>
                        </Gtk.StackPage>
                    </Gtk.Stack>
                }
            </For>
        </Gtk.Box>
    </Astal.Window> as Astal.Window;
