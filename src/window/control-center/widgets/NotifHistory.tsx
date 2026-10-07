import { Gtk } from "ags/gtk4";
import { createBinding, For } from "ags";
import Notifications from "../../../modules/notifications";
import AstalNotifd from "gi://AstalNotifd";
import Adw from "gi://Adw?version=1";
import Notification from "../../../widget/Notification";


export const NotifHistory = () =>
    <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.CROSSFADE} transitionDuration={420}
      revealChild={createBinding(Notifications.getDefault(), "history")(hist => hist.length > 0)}>

        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} class={"notif-history"} vexpand={false}>
            <Gtk.ScrolledWindow class={"history-scrollable"} hscrollbarPolicy={Gtk.PolicyType.NEVER}
              vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC} propagateNaturalHeight
              propagateNaturalWidth
              onShow={(self) => {
                  if(!(self.get_child()! as Gtk.Viewport).get_child()) return;

                  self.minContentHeight = 
                      ((self.get_child()! as Gtk.Viewport).get_child() as Gtk.Box
                          ).get_first_child()!.get_allocation().height 
                      || 0;
              }}>

                <Gtk.Box class={"notifications"} orientation={Gtk.Orientation.VERTICAL}
                  spacing={4} valign={Gtk.Align.START}>

                    <For each={createBinding(Notifications.getDefault(), "history")}>
                        {(notif: AstalNotifd.Notification|Notifications.HistoryNotification) => 
                            <Notification summary={notif.summary} body={notif.body}
                              time={notif.time} appName={notif.appName} appIcon={notif.appIcon}
                              id={notif.id} image={notif.image} onDismissed={() => {
                                  Notifications.getDefault().removeHistory(notif.id);
                              }}
                            />
                        }
                    </For>
                </Gtk.Box>
            </Gtk.ScrolledWindow>

            <Gtk.Box class={"button-row"} halign={Gtk.Align.END}>
                <Gtk.Button class={"clear-all reactive-secondary"}
                  onClicked={() => Notifications.getDefault().clearHistory()}>

                    <Adw.ButtonContent iconName={"edit-clear-all-symbolic"}
                      label={tr("clear")}
                    />
                </Gtk.Button>
            </Gtk.Box>
        </Gtk.Box>
    </Gtk.Revealer> as Gtk.Revealer;
