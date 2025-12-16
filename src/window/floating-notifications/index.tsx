import { Astal, Gdk, Gtk } from "ags/gtk4";
import { createBinding, createComputed, For } from "ags";
import { Notifications } from "../../modules/notifications";
import { Notification } from "../../widget/Notification";
import { generalConfig } from "../../config";
import { Windows } from "../../windows";

import AstalNotifd from "gi://AstalNotifd";
import Adw from "gi://Adw?version=1";
import { pathToURI } from "../../modules/utils";


const size = 450;

export const FloatingNotifications = (mon: number) => 
    <Astal.Window namespace={"floating-notifications"} monitor={mon} layer={Astal.Layer.OVERLAY}
      anchor={createComputed([
          generalConfig.bindProperty("notifications.position_h", "string"),
          generalConfig.bindProperty("notifications.position_v", "string"),
          createBinding(Windows.getDefault(), "openWindows")
      ]).as(([posH, posV]) => {
          const pos: Array<Astal.WindowAnchor> = [];

          switch(posH) {
              case "left":
                  pos.push(Astal.WindowAnchor.LEFT);
              break;
              case "center":
                  pos.push(Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT);
              break;
              case "right":
                  pos.push(Astal.WindowAnchor.RIGHT);
              break;
          }

          switch(posV) {
              case "top":
                  pos.push(Astal.WindowAnchor.TOP);
              break;
              case "center":
                  pos.push(Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM);
              break;
              case "bottom":
                  pos.push(Astal.WindowAnchor.BOTTOM);
              break;
          }

          let finalAnchor!: Astal.WindowAnchor;

          pos.forEach(pos => finalAnchor = (finalAnchor !== undefined ? 
              finalAnchor | pos
          : pos));

          return finalAnchor ?? (Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT);

      })} exclusivity={Astal.Exclusivity.NORMAL} widthRequest={size}>

        <Adw.Clamp orientation={Gtk.Orientation.HORIZONTAL} maximumSize={size} valign={Gtk.Align.START}>
            <Gtk.Box class={"floating-notifications-container"} orientation={Gtk.Orientation.VERTICAL}
              spacing={12}>
                <For each={createBinding(Notifications.getDefault(), "notifications")}>
                    {(notif: AstalNotifd.Notification) => 
                        <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SWING_UP} transitionDuration={200}
                          revealChild>
                            <Gtk.Stack transitionType={createComputed([
                                  generalConfig.bindProperty("notifications.position_h", "string"),
                                  generalConfig.bindProperty("notifications.position_v", "string")
                              ]).as(() => { // TODO: support different animations depending on screen position
                                  return Gtk.StackTransitionType.SLIDE_RIGHT
                              })} transitionDuration={300}>

                                <Notification valign={Gtk.Align.START} summary={createBinding(notif, "summary")}
                                  body={createBinding(notif, "body")} appIcon={createBinding(notif, "appIcon")}
                                  appName={createBinding(notif, "appName")} time={createBinding(notif, "time")}
                                  image={createComputed([
                                      createBinding(notif, "image"),
                                      createBinding(notif, "appIcon")
                                  ], (img, icon) => {
                                      if(img?.trim())
                                          // pathToURI() resolves directories starting with ~/ (home)
                                          return pathToURI(img).replace("file://", "");

                                      if(icon?.startsWith('/')) // only use icon as image if it starts with an absolute path
                                          return icon;

                                      return "";
                                  })}
                                  onActionClicked={(_, action) => notif.invoke(action.id)}
                                  actions={createBinding(notif, "actions").as(actions => 
                                      actions.filter(a => !/^view$/i.test(a.id) && !/^view$/i.test(a.label))
                                  )}
                                  onDismissed={() => Notifications.getDefault().removeNotification(notif)}
                                  widthRequest={size} id={notif.id}>

                                    <Gtk.GestureClick onReleased={(gesture) => {
                                        if(gesture.get_current_button() !== Gdk.BUTTON_PRIMARY)
                                            return;

                                        const viewActionRegEx = /^view$/i;
                                        const viewAction = notif.actions.filter(a => 
                                            viewActionRegEx.test(a.id) || viewActionRegEx.test(a.label)
                                        )?.[0];

                                        viewAction && notif.invoke(viewAction.id);
                                    }} />
                                </Notification>
                            </Gtk.Stack>
                        </Gtk.Revealer>
                    }
                </For>
            </Gtk.Box>
        </Adw.Clamp>
    </Astal.Window> as Astal.Window;
