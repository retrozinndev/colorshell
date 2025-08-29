import { Astal, Gtk } from "ags/gtk4";
import { createBinding, For } from "ags";
import { Notifications } from "../modules/notifications";
import { NotificationWidget } from "../widget/Notification";

import AstalNotifd from "gi://AstalNotifd?version=0.1";
import Adw from "gi://Adw?version=1";

const size = 450;

export const FloatingNotifications = (mon: number) => 
    <Astal.Window namespace={"floating-notifications"} monitor={mon} layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT} exclusivity={Astal.Exclusivity.NORMAL}
      resizable={false} widthRequest={450}>

        <Gtk.Box class={"floating-notifications-container"} spacing={12}
          orientation={Gtk.Orientation.VERTICAL}>

            <For each={createBinding(Notifications.getDefault(), "notifications")}>
                {(notif: AstalNotifd.Notification) => 
                    <Adw.Clamp maximumSize={size}>
                        <Gtk.Box class={"float-notification"} widthRequest={size} vexpand={false}>

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
                    </Adw.Clamp>
                }
            </For>
        </Gtk.Box>
    </Astal.Window> as Astal.Window;
