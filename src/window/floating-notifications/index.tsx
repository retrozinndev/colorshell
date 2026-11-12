import { Astal, Gtk } from "ags/gtk4";
import { createComputed, This, type Scope } from "ags";
import Notifications from "../../modules/notifications";
import { generalConfig } from "../../config";
import { createScopedConnection } from "../../modules/utils";
import AstalNotifd from "gi://AstalNotifd";
import Adw from "gi://Adw?version=1";
import Windows from "..";
import FloatingNotification from "./widgets/FloatingNotification";


export const FloatingNotifications = Windows.forFocusedMonitor(function (_, scope) {
    const width = 450;
    const container = new Gtk.Box();
    const notifications: Array<AstalNotifd.Notification> = [];

    function addNotification(scope: Scope, container: Gtk.Box, notification: AstalNotifd.Notification): FloatingNotification {
        function add(container: Gtk.Box, child: Gtk.Widget): void {
            if(generalConfig.getProperty("notifications.position_v", "string") === "top") {
                container.prepend(child);
                return;
            }

            container.append(child);
        }

        notifications.push(notification);

        return scope.run(() => {
            const widget =
                <FloatingNotification notification={notification}
                  onNotifyChildRevealed={(self) => {
                      if(self.childRevealed)
                          return;

                      notifications.splice(notifications.findIndex(n => notification.id === n.id), 1);
                      self.unparent(); // remove on animation end
                      if(notifications.length < 1)
                          Windows.getDefault().close("floating-notifications");
                  }}
                /> as FloatingNotification;

            add(container, widget);
            return widget;
        });
    }

    const window = <Astal.Window namespace={"floating-notifications"} 
      layer={Astal.Layer.OVERLAY} anchor={createComputed(() => {
          const posH = generalConfig.bindProperty("notifications.position_h", "string")(),
            posV = generalConfig.bindProperty("notifications.position_v", "string")();
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
      })}
      exclusivity={Astal.Exclusivity.NORMAL}
      class={"floating-notifications"}>

        <Adw.Clamp maximumSize={width} widthRequest={width} valign={Gtk.Align.START}
          halign={Gtk.Align.END} orientation={Gtk.Orientation.HORIZONTAL}>

            <This this={container} class={"floating-notifications-container"}
              orientation={Gtk.Orientation.VERTICAL}
              valign={Gtk.Align.START} halign={Gtk.Align.END}
              widthRequest={width}
            />
        </Adw.Clamp>
    </Astal.Window> as Astal.Window;

    if(Notifications.getDefault().notifications.length > 0) {
        Notifications.getDefault().notifications.forEach(notif => {
            const id = window.connect("show", () => {
                window.disconnect(id);
                addNotification(scope, container, notif)
                    .revealChild = true;
            });
        });
    }

    createScopedConnection(
        Notifications.getDefault(), "notification-added", (notif) => {
            addNotification(scope, container, notif)
                .revealChild = true;
        }
    );

    return window;
});
