import { Astal, Gdk, Gtk } from "ags/gtk4";
import { createBinding, createComputed, Scope } from "ags";
import { Notifications } from "../../modules/notifications";
import { Notification } from "../../widget/Notification";
import { generalConfig } from "../../config";
import { Windows } from "../../windows";
import { createScopedConnection, pathToURI } from "../../modules/utils";

import AstalNotifd from "gi://AstalNotifd";
import Adw from "gi://Adw?version=1";


const size = 450;

export const FloatingNotifications = (mon: number, scope: Scope) => {
    function buildNotification(notif: AstalNotifd.Notification): Gtk.Revealer {
        return scope.run(() => 
            <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SWING_UP} transitionDuration={200}>
                <Gtk.Stack transitionType={createComputed([
                      generalConfig.bindProperty("notifications.position_h", "string"),
                      generalConfig.bindProperty("notifications.position_v", "string")
                  ]).as(() => { // TODO: support different animations depending on screen position
                      return Gtk.StackTransitionType.SLIDE_RIGHT
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
                            ], (img, icon) => {
                                if(img?.trim())
                                    // pathToURI() resolves directories starting with ~/ (home)
                                    return pathToURI(img).replace("file://", "");

                                if(icon?.startsWith('/')) // only use icon as image if it starts with an absolute path
                                    return icon;

                                return "";
                            })}
                            onActionClicked={(_, action) => notif.invoke(action.id)}
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

                                  viewAction && notif.invoke(viewAction.id);
                              }} />

                              <Gtk.EventControllerMotion onEnter={() => 
                                  generalConfig.getProperty("notifications.hold_on_hover", "boolean") &&
                                      Notifications.getDefault().holdNotification(notif.id)
                              } onLeave={() => {
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

    return <Astal.Window namespace={"floating-notifications"} monitor={mon} layer={Astal.Layer.OVERLAY}
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

      })} exclusivity={Astal.Exclusivity.NORMAL} widthRequest={size}
      class={"floating-notifications"}>

        <Adw.Clamp orientation={Gtk.Orientation.HORIZONTAL} maximumSize={size} valign={Gtk.Align.START}>
            <Gtk.Box class={"floating-notifications-container"} orientation={Gtk.Orientation.VERTICAL}
              $={self => {
                  function add(notif: AstalNotifd.Notification): void {
                      const notifId = notif.id; // store id, because the notif object can be disposed before the widget is removed
                      const widget = buildNotification(notif);
                      const stack = widget.get_child() as Gtk.Stack;
                      self.prepend(widget);
                      widget.set_reveal_child(true);
                      stack.set_visible_child_name("notification");

                      const id = Notifications.getDefault().connect("notification-removed", (_, removedId) => {
                          if(removedId !== notifId)
                              return;

                          stack.set_visible_child_name("empty");
                          widget.set_reveal_child(false);
                          setTimeout(() => {
                              Notifications.getDefault().disconnect(id);
                              widget.get_parent() && self.remove(widget);
                              if(!self.get_first_child())
                                  (self.get_root() as Astal.Window)?.close();
                          }, stack.transitionDuration + widget.transitionDuration);
                      });
                  }

                  Notifications.getDefault().notifications.length > 0 &&
                      Notifications.getDefault().notifications.forEach(n => add(n));

                  createScopedConnection(
                      Notifications.getDefault(), "notification-added", (notif) => add(notif)
                  );
              }}
            />
        </Adw.Clamp>
    </Astal.Window> as Astal.Window;
}
