import { Gtk } from "ags/gtk4";
import { HistoryNotification, Notifications } from "../../modules/notifications";
import { NotificationWidget } from "../Notification";
import { tr } from "../../i18n/intl";
import { createBinding, For } from "ags";
import AstalNotifd from "gi://AstalNotifd?version=0.1";


export const NotifHistory = () => 
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} 
      class={createBinding(Notifications.getDefault(), "history").as(history => 
          `notif-history ${history.length < 1 ? "hide" : ""}`)} vexpand={false}>

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

        <Gtk.Box class={"button-row"} hexpand>
            <Gtk.Button class={"clear-all"} halign={Gtk.Align.END}
              onClicked={() => Notifications.getDefault().clearHistory()}>

                <Gtk.Box hexpand>
                    <Gtk.Image class={"icon"} iconName={"edit-clear-all-symbolic"} 
                      css={"margin-right: 6px;"}  />
                    <Gtk.Label label={tr("clear")} />
                </Gtk.Box>
            </Gtk.Button>
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
