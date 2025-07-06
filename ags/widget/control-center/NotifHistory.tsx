import { Gtk } from "ags/gtk4";
import { HistoryNotification, Notifications } from "../../scripts/notifications";
import { NotificationWidget } from "../Notification";
import { tr } from "../../i18n/intl";
import { createBinding, For } from "ags";
import AstalNotifd from "gi://AstalNotifd?version=0.1";


export const NotifHistory = () => 
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} 
      class={createBinding(Notifications.getDefault(), "history").as(history => 
          `history ${history.length < 1 ? "hide" : ""}`)}>

        <Gtk.ScrolledWindow class={"history-scrollable"} hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} propagateNaturalHeight={true}
          onShow={(self) => {
              if(!(self.get_child()! as Gtk.Viewport).get_child()) return;

              self.minContentHeight = 
                  ((self.get_child()! as Gtk.Viewport).get_child() as Gtk.Box
                      ).get_first_child()!.get_allocation().height 
                  || 0;
          }}>

            <Gtk.Box class={"notifications"} hexpand={true} orientation={Gtk.Orientation.VERTICAL}
              spacing={4} valign={Gtk.Align.START}>

                <For each={createBinding(Notifications.getDefault(), "history")}>
                    {(notif: AstalNotifd.Notification|HistoryNotification) => 
                        <NotificationWidget notification={notif} showTime={true}
                          actionClose={(n) => Notifications.getDefault().removeHistory(n.id)}
                          actionClicked={(n) => Notifications.getDefault().removeHistory(n.id)}
                    />}
                </For>
            </Gtk.Box>
        </Gtk.ScrolledWindow>

        <Gtk.Box hexpand={true} class={"button-row"} halign={Gtk.Align.END}>
            <Gtk.Button class={"clear-all"} iconName={"edit-clear-all-symbolic"}
              label={tr("clear")} onClicked={Notifications.getDefault().clearHistory} />
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
