import { Astal, Gtk } from "ags/gtk4";
import { createBinding, For } from "ags";
import { Notifications } from "../scripts/notifications";
import { NotificationWidget } from "../widget/Notification";
import { variableToBoolean } from "../scripts/utils";
import AstalNotifd from "gi://AstalNotifd?version=0.1";


export const FloatingNotifications = (mon: number) => 
    <Astal.Window namespace={"floating-notifications"} monitor={mon} layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT} widthRequest={450} 
      exclusivity={Astal.Exclusivity.NORMAL}>

        <Gtk.Box class={"floating-notifications-container"} 
          orientation={Gtk.Orientation.VERTICAL} spacing={12}
          visible={variableToBoolean(createBinding(Notifications.getDefault(), "notifications"))}>

            <For each={createBinding(Notifications.getDefault(), "notifications")}>
                {(notif: AstalNotifd.Notification) => 
                    <Gtk.Box class={"float-notification"}>
                        <NotificationWidget notification={notif} showTime={false}
                          actionClose={() => Notifications.getDefault().removeNotification(notif)}
                          holdOnHover={true} actionClicked={() => {
                              const viewAction = notif.actions.filter(action => 
                                  action.label.toLowerCase() === "view")?.[0];

                              viewAction && notif.invoke(viewAction.id);
                          }}
                        />
                    </Gtk.Box>
                }
            </For>
        </Gtk.Box>
    </Astal.Window> as Astal.Window;
