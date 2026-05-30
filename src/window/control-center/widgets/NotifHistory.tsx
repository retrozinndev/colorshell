import { Gdk, Gtk } from "ags/gtk4";
import { Notification } from "../../../widget/Notification";
import { createBinding, For } from "ags";
import Notifications from "../../../modules/notifications";
import AstalNotifd from "gi://AstalNotifd?version=0.1";


export const NotifHistory = () => 
    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} 
      class={createBinding(Notifications.getDefault(), "history").as(history => 
          `notif-history ${history.length < 1 ? "hide" : ""}`)} vexpand={false}>

        <Gtk.ScrolledWindow class={"history-scrollable"} hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} propagateNaturalHeight={true}
          /*onShow={(self) => {
              const viewport = self.get_child() as Gtk.Viewport;
              if(!viewport.get_child()) return;

              self.minContentHeight = 
                  (viewport.get_child() as Gtk.Box).get_first_child()!
                    .compute_bounds(viewport.get_child()!)[1].get_height() 
                  || 0;
          }}*/>

            <Gtk.Box class={"notifications"} hexpand={true} orientation={Gtk.Orientation.VERTICAL}
              spacing={4} valign={Gtk.Align.START}>

                <For each={createBinding(Notifications.getDefault(), "history")}>
                    {(notif: AstalNotifd.Notification|Notifications.HistoryNotification) => 
                        <Notification summary={notif.summary} body={notif.body} time={notif.time}
                          appName={notif.appName} appIcon={notif.appIcon} image={
                              Notifications.getDefault().getNotificationImage(notif)
                          } onDismissed={() => Notifications.getDefault().removeHistory(notif)}
                          id={notif.id}>
                            
                            <Gtk.GestureClick onReleased={(gesture) => {
                                if(gesture.get_current_button() !== Gdk.BUTTON_PRIMARY)
                                    return;

                                Notifications.getDefault().removeHistory(notif);
                            }} />
                        </Notification>
                    }
                </For>
            </Gtk.Box>
        </Gtk.ScrolledWindow>

        <Gtk.Box class={"button-row"} hexpand>
            <Gtk.Button class={"clear-all reactive-secondary"} halign={Gtk.Align.END}
              onClicked={() => Notifications.getDefault().clearHistory()}>

                <Gtk.Box hexpand>
                    <Gtk.Image class={"icon"} iconName={"edit-clear-all-symbolic"} 
                      css={"margin-right: 6px;"}  />
                    <Gtk.Label label={tr("clear")} />
                </Gtk.Box>
            </Gtk.Button>
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
