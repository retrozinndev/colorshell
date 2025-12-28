import { Astal, Gdk, Gtk } from "ags/gtk4";
import { createBinding, createComputed, Scope } from "ags";
import { Notifications } from "../../modules/notifications";
import { Notification } from "../../widget/Notification";
import { generalConfig } from "../../config";
import { createScopedConnection } from "../../modules/utils";

import AstalNotifd from "gi://AstalNotifd";
import Adw from "gi://Adw?version=1";


const size = 450;

export const FloatingNotifications = (mon: number, scope: Scope) => {
    function buildNotification(notif: AstalNotifd.Notification): Gtk.Revealer {
        return scope.run(() => 
            <Gtk.Revealer transitionType={generalConfig.bindProperty("notifications.position_v", "string").as(vPos => {
                switch(vPos) {
                    case "center": // idk why anyone would want that, but here's it is anyways
                        return Gtk.RevealerTransitionType.CROSSFADE;

                    case "bottom":
                        return Gtk.RevealerTransitionType.SWING_DOWN;
                }

                return Gtk.RevealerTransitionType.SWING_UP;
            })} transitionDuration={420}>
                <Gtk.Stack transitionType={createComputed([
                      generalConfig.bindProperty("notifications.position_h", "string"),
                      generalConfig.bindProperty("notifications.position_v", "string")
                  ], (hPos, vPos) => {

                      if(hPos === "left") 
                          return Gtk.StackTransitionType.SLIDE_LEFT;

                      if(hPos === "right")
                          return Gtk.StackTransitionType.SLIDE_RIGHT;

                      if(hPos === "center") {
                          switch(vPos) {
                              case "center":
                                  return Gtk.StackTransitionType.CROSSFADE;

                              case "top":
                                  return Gtk.StackTransitionType.SLIDE_UP;
                          }

                          return Gtk.StackTransitionType.SLIDE_DOWN;
                      }

                      return Gtk.StackTransitionType.SLIDE_UP;
                  })} transitionDuration={300} 
                  $={self => {
                      // empty widget just for the transition
                      self.add_named(
                          <Adw.Bin /> as Adw.Bin,
                          "empty"
                      );

                      self.add_named(
                          <Notification valign={Gtk.Align.START} summary={createBinding(notif, "summary")}
                            body={createBinding(notif, "body")} appIcon={createBinding(notif, "appIcon")}
                            appName={createBinding(notif, "appName")} time={createBinding(notif, "time")}
                            image={createComputed([
                                createBinding(notif, "image"),
                                createBinding(notif, "appIcon")
                            ], () => (Notifications.getDefault().getNotificationImage(notif) ?? null)!)}
                            onActionClicked={(_, action) => {
                                notif.invoke(action.id);
                                Notifications.getDefault().removeNotification(notif);
                            }}
                            actions={notif.actions.filter(a => !/^view$/i.test(a.id) && !/^view$/i.test(a.label))}
                            onDismissed={() => Notifications.getDefault().removeNotification(notif)}
                            widthRequest={size} id={notif.id}>

                              <Gtk.GestureClick onReleased={(gesture) => {
                                  if(gesture.get_current_button() !== Gdk.BUTTON_PRIMARY)
                                      return;

                                  const viewActionRegEx = /^view$/i;
                                  const viewAction = notif.actions.filter(a => 
                                      viewActionRegEx.test(a.id) || viewActionRegEx.test(a.label)
                                  )?.[0];

                                  if(!viewAction) 
                                      return;

                                  viewAction && notif.invoke(viewAction.id);
                                  Notifications.getDefault().removeNotification(notif);
                              }} />

                              <Gtk.EventControllerMotion onEnter={() => {
                                  if(!generalConfig.getProperty("notifications.hold_on_hover", "boolean") ||
                                        notif.get_urgency() === AstalNotifd.Urgency.CRITICAL)
                                      return;

                                  Notifications.getDefault().holdNotification(notif.id);
                              }} onLeave={() => {
                                  const dismissOnUnhover = generalConfig
                                    .getProperty("notifications.dismiss_on_unhover", "boolean");

                                  if(dismissOnUnhover) {
                                      setTimeout(() => {
                                          Notifications.getDefault().removeNotification(notif.id)
                                      }, 600);

                                      return;
                                  }

                                  Notifications.getDefault().releaseNotification(notif.id);
                              }}
                            />
                          </Notification> as Notification,
                          "notification"
                      );
                  }}
                />
            </Gtk.Revealer> as Gtk.Revealer
        );
    }

    function add(container: Gtk.Box, notif: AstalNotifd.Notification): void {
        const notifId = notif.id; // store id, because the notif object can be disposed before the widget is removed
        const widget = buildNotification(notif);
        const stack = widget.get_child() as Gtk.Stack;

        notifs.push(notifId);
        generalConfig.getProperty("notifications.position_v", "string") === "top" ?
            container.prepend(widget)
        : container.append(widget);
        widget.set_reveal_child(true);
        stack.set_visible_child_name("notification");

        const ids = [
            Notifications.getDefault().connect("notification-removed", (_, removedId) => {
                if(removedId !== notifId)
                    return;

                notifs.splice(notifs.findIndex(id => id === notifId), 1);
                stack.set_visible_child_name("empty");
                setTimeout(() => widget.set_reveal_child(false), stack.transitionDuration);
                setTimeout(() => {
                    ids.forEach(id => Notifications.getDefault().disconnect(id));
                    widget.get_parent() && container.remove(widget);
                    if(!container.get_first_child())
                        (container.get_root() as Astal.Window)?.close();
                }, stack.transitionDuration + widget.transitionDuration);
            }),
            Notifications.getDefault().connect("notification-replaced", (_, replacedId) => {
                if(replacedId !== notifId)
                    return;

                const newNotif = Notifications.getDefault().notifications.find(n => n.id === replacedId)!;

                const notifWidget = stack.get_child_by_name("notification") as Notification;
                notifWidget.summary = newNotif.summary;
                notifWidget.body = newNotif.body;
                notifWidget.actions = newNotif.actions;
                notifWidget.appIcon = newNotif.appIcon;
                notifWidget.appName = newNotif.appName;
                notifWidget.image = Notifications.getDefault().getNotificationImage(newNotif) ?? null;
            })
        ];
    }

    const notifs: Array<number> = [];

    const window = <Astal.Window namespace={"floating-notifications"} monitor={mon} layer={Astal.Layer.OVERLAY}
      anchor={createComputed([
          generalConfig.bindProperty("notifications.position_h", "string"),
          generalConfig.bindProperty("notifications.position_v", "string")
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

      })} exclusivity={Astal.Exclusivity.NORMAL} widthRequest={size}
      class={"floating-notifications"}>

        <Adw.Clamp orientation={Gtk.Orientation.HORIZONTAL} maximumSize={size} valign={Gtk.Align.START}>
            <Gtk.Box class={"floating-notifications-container"} orientation={Gtk.Orientation.VERTICAL} />
        </Adw.Clamp>
    </Astal.Window> as Astal.Window;

    window.show();
    const container = (window.get_child() as Adw.Clamp).get_child() as Gtk.Box;
    
    Notifications.getDefault().notifications.length > 0 &&
        Notifications.getDefault().notifications.forEach(n => add(container, n));

    createScopedConnection(
        Notifications.getDefault(), "notification-added", (notif) => {
            if(notifs.includes(notif.id))
                return;

            add(container, notif);
        }
    );

    return window;
}
