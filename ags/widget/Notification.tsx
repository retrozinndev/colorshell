import { Gdk, Gtk } from "ags/gtk4";
import { Separator } from "./Separator";
import { HistoryNotification, Notifications } from "../scripts/notifications";
import { getAppIcon, getSymbolicIcon } from "../scripts/apps";

import AstalNotifd from "gi://AstalNotifd";
import Pango from "gi://Pango?version=1.0";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject?version=2.0";

function getNotificationImage(notif: AstalNotifd.Notification|HistoryNotification): (string|undefined) {
    const img = notif.image || notif.appIcon;

    if(!img || !img.includes('/')) 
        return undefined;

    switch(true) {
        case /^[/]/.test(img): 
            return `file://${img}`;

        case /^[~]/.test(img):
        case /^file:\/\/[~]/i.test(img):
            return `file://${GLib.get_home_dir()}/${img.replace(/^(file\:\/\/|[~]|file\:\/\[~])/i, "")}`;
    }

    return img;
}

export function NotificationWidget({ notification, actionClicked, holdOnHover, showTime, actionClose }: {
        notification: AstalNotifd.Notification|number|HistoryNotification;
        actionClicked?: (notif: AstalNotifd.Notification|HistoryNotification) => void;
        actionClose?: (notif: AstalNotifd.Notification|HistoryNotification) => void;
        holdOnHover?: boolean;
        showTime?: boolean; // It's showTime :speaking_head: :boom: :bangbang:
    }): Gtk.Widget {

    notification = (typeof notification === "number") ? 
        AstalNotifd.get_default().get_notification(notification)
    : notification;

    const conns: Map<GObject.Object, Array<number>> = new Map();

    return <Gtk.Box hexpand class={`notification ${
          Notifications.getDefault().getUrgencyString(notification.urgency)
      }`} orientation={Gtk.Orientation.VERTICAL} spacing={5}
      $={(self) => {
          const eventControllerMotion = Gtk.EventControllerMotion.new(),
              gestureClick = Gtk.GestureClick.new();

          self.add_controller(eventControllerMotion);
          self.add_controller(gestureClick);

          conns.set(eventControllerMotion, [
              eventControllerMotion.connect("enter", () => 
                  holdOnHover && Notifications.getDefault().holdNotification(notification.id)),
              eventControllerMotion.connect("leave", () => 
                  holdOnHover && Notifications.getDefault().removeNotification(notification.id))
          ]);

          conns.set(gestureClick, [
              gestureClick.connect("released", (gesture) => {
                  gesture.get_current_button() === Gdk.BUTTON_PRIMARY &&
                      actionClicked?.(notification);
              })
          ]);
      }} onDestroy={(_) => {
          conns.forEach((ids, obj) => ids.forEach(id => obj.disconnect(id)));
      }}>

        <Gtk.Box class={"top"} hexpand>
            <Gtk.Image css={"font-size: 16px;"} $={(self) => {
                  const icon = getSymbolicIcon(notification.appIcon ?? notification.appName) ?? 
                      getSymbolicIcon(notification.appName) ?? getAppIcon(notification.appName);

                  if(icon) {
                      self.set_from_icon_name(icon);
                      return;
                  }

                  self.set_visible(false);
            }} />
            <Gtk.Label class={"app-name"} halign={Gtk.Align.START} hexpand={true} 
              label={notification.appName || "Application"} />

            <Gtk.Label class={"time"} visible={showTime} xalign={1} 
              label={GLib.DateTime.new_from_unix_local(notification.time).format("%H:%M") ?? ""} />

            <Gtk.Button halign={Gtk.Align.END} iconName={"window-close-symbolic"} 
              class={"close icon"}/>
        </Gtk.Box>
        <Separator alpha={.1} orientation={Gtk.Orientation.VERTICAL} />
        <Gtk.Box class={"content"} $={(self) => {
            const image = getNotificationImage(notification);
            
            image &&
                self.prepend(Gtk.Picture.new_for_filename(image));
          }}>

            <Gtk.Box class={"text"} orientation={Gtk.Orientation.VERTICAL}
              vexpand={true}>

                <Gtk.Label class={"summary"} useMarkup={true} hexpand={false} xalign={0}
                  vexpand ellipsize={Pango.EllipsizeMode.END} label={
                      notification.summary.replace(/[&]/g, "&amp;")}
                />

                <Gtk.Label class={"body"} useMarkup={true} xalign={0} wrap={true} hexpand={false}
                  vexpand wrapMode={Pango.WrapMode.WORD_CHAR} label={
                      notification.body.replace(/[&]/g, "&amp;")}
                />
            </Gtk.Box>
        </Gtk.Box>

        <Gtk.Box class={"action button-row"} hexpand={true} visible={
            (notification instanceof AstalNotifd.Notification) &&
                (notification.actions.filter(action => action.label.toLowerCase() !== "view").length > 0)
        }>
            {
              (notification instanceof AstalNotifd.Notification) && 
                notification.actions.filter(a => a.label.toLowerCase() !== "view").map(action =>
                    <Gtk.Button class={"action"} label={action.label} 
                      hexpand={true} onClicked={(_) => {
                          notification.invoke(action.id);
                          actionClose?.(notification);
                      }}
                    />)
            }
        </Gtk.Box>
    </Gtk.Box> as Gtk.Widget;
}
