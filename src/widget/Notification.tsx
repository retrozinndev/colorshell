import { Gdk, Gtk } from "ags/gtk4";
import { Separator } from "./Separator";
import { HistoryNotification, Notifications } from "../modules/notifications";
import { getAppIcon, getSymbolicIcon } from "../modules/apps";
import { escapeUnintendedMarkup, pathToURI } from "../modules/utils";
import { onCleanup } from "ags";

import GObject from "ags/gobject";
import AstalNotifd from "gi://AstalNotifd";
import Pango from "gi://Pango?version=1.0";
import GLib from "gi://GLib?version=2.0";


function getNotificationImage(notif: AstalNotifd.Notification|HistoryNotification): (string|undefined) {
    const img = notif.image || notif.appIcon;

    if(!img || !img.includes('/')) 
        return undefined;

    return pathToURI(img);
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

    const actions: Array<AstalNotifd.Action>|undefined = ((notification instanceof AstalNotifd.Notification) &&
        notification.actions && notification.actions.filter(a => Boolean(a)).length > 0) ? 
            notification.actions?.filter(a => 
                a?.id?.toLowerCase() !== "view" && a?.label?.toLowerCase() != "view"
            )
    : undefined;

    const conns: Map<GObject.Object, Array<number>> = new Map();

    onCleanup(() => conns.forEach((ids, obj) => 
        ids.forEach(id => obj.disconnect(id))
    ));

    return <Gtk.Box hexpand class={`notification ${
          Notifications.getDefault().getUrgencyString(notification.urgency)
      }`} orientation={Gtk.Orientation.VERTICAL} spacing={5}>

        <Gtk.EventControllerMotion onEnter={() => holdOnHover && 
              Notifications.getDefault().holdNotification(notification.id)
          } onLeave={() => holdOnHover &&
              Notifications.getDefault().releaseNotification(notification.id)
          }
        />
        <Gtk.GestureClick onReleased={(gesture) => 
            gesture.get_current_button() === Gdk.BUTTON_PRIMARY &&
                actionClicked?.(notification)
        } />
        <Gtk.Box class={"top"} hexpand>
            <Gtk.Image class="app-icon" $={(self) => {
                  const icon = getSymbolicIcon(notification.appIcon ?? notification.appName) ?? 
                      getSymbolicIcon(notification.appName) ?? getAppIcon(notification.appName);

                  if(icon) {
                      self.set_from_icon_name(icon);
                      return;
                  }

                  self.set_visible(false);
            }} />
            <Gtk.Label class={"app-name"} halign={Gtk.Align.START} hexpand
              label={notification.appName || "Application"} />

            <Gtk.Label class={"time"} visible={showTime} xalign={1} 
              label={GLib.DateTime.new_from_unix_local(notification.time).format("%H:%M") ?? ""} />

            <Gtk.Button halign={Gtk.Align.END} iconName={"window-close-symbolic"} 
              class={"close"} onClicked={() => actionClose?.(notification)}/>
        </Gtk.Box>
        <Separator alpha={.1} orientation={Gtk.Orientation.VERTICAL} />
        <Gtk.Box class={"content"}>
            {getNotificationImage(notification) && 
                <Gtk.Box class={"image"} hexpand={false} 
                  css={`background-image: url("${getNotificationImage(notification)}");`} 
                  valign={Gtk.Align.START}
                  widthRequest={68}
                  heightRequest={64}
                />
            }
            <Gtk.Box class={"text"} orientation={Gtk.Orientation.VERTICAL}
              vexpand>

                <Gtk.Label class={"summary"} useMarkup hexpand xalign={0}
                  vexpand={false} ellipsize={Pango.EllipsizeMode.END} label={
                      escapeUnintendedMarkup(notification.summary)}
                />

                <Gtk.Label class={"body"} useMarkup xalign={0} wrap hexpand
                  vexpand wrapMode={Pango.WrapMode.WORD_CHAR} valign={Gtk.Align.START} label={
                      escapeUnintendedMarkup(notification.body)}
                />
            </Gtk.Box>
        </Gtk.Box>

        {(notification instanceof AstalNotifd.Notification) && actions && actions.length > 0 &&
            <Gtk.Box class={"actions button-row"} hexpand>
                { 
                    actions.map(action =>
                        <Gtk.Button class={"action"} label={action.label} hexpand 
                          onClicked={(_) => {
                              notification.invoke(action.id);
                              actionClose?.(notification);
                          }}
                        />)
                }
            </Gtk.Box>
        }
    </Gtk.Box> as Gtk.Widget;
}
