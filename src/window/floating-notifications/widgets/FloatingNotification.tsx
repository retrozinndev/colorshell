import { getter, register } from "ags/gobject";
import Gtk from "gi://Gtk?version=4.0";
import AstalNotifd from "gi://AstalNotifd?version=0.1";
import { generalConfig } from "../../../config";
import Notifications from "../../../modules/notifications";
import Notification from "../../../widget/Notification";
import { Accessor, createBinding, createComputed, This } from "ags";
import Gdk from "gi://Gdk?version=4.0";
import GObject from "gi://GObject?version=2.0";


/** A widget that wraps `ClshNotification` into a revealer,
  * so we can animate the notification sliding in and out.
  * it automatically connects to the notif daemon and monitors
  * whether the provided notification is removed and does its
  * thing. */
@register({ GTypeName: "ClshFloatingNotification" })
class FloatingNotification extends Gtk.Revealer {
    #notification: AstalNotifd.Notification;
    #notifConnections: Array<number> = [];
    #widget: Notification;

    @getter(GObject.Object)
    get notification() { return this.#notification; }

    constructor({ notification, ...props }: {
        notification: AstalNotifd.Notification;
    }&Partial<Gtk.Revealer.ConstructorProps>) {
        super({
            revealChild: false,
            transitionDuration: 420,
            transitionType: Gtk.RevealerTransitionType.SLIDE_DOWN,
            overflow: Gtk.Overflow.VISIBLE,
            ...props
        });

        if(!notification)
            throw new Error("No notification object provided for FloatingNotification");

        this.#notification = notification;
        this.transitionType = this.getSlideAnimation(
            generalConfig.getProperty("notifications.position_h", "string"),
            generalConfig.getProperty("notifications.position_v", "string")
        );
        this.#widget = 
            <Notification valign={Gtk.Align.START} summary={createBinding(this.#notification, "summary")}
              body={createBinding(this.#notification, "body")} appIcon={createBinding(this.#notification, "appIcon")}
              appName={createBinding(this.#notification, "appName")} time={createBinding(this.#notification, "time")}
              image={createComputed(() => {
                  createBinding(this.#notification, "image")();
                  createBinding(this.#notification, "appIcon")();

                  return Notifications.getNotificationImage(this.#notification) ?? null;
              }) as Accessor<string>}
              onActionClicked={(_, action) => {
                  this.#notification.invoke(action.id);
                  Notifications.getDefault().removeNotification(this.#notification);
              }}
              actions={this.#notification.actions.filter(a => !/^view$/i.test(a.id) && !/^view$/i.test(a.label))}
              onDismissed={() => Notifications.getDefault().removeNotification(this.#notification.id)}
              id={this.#notification.id}
            /> as Notification;

        this.#notifConnections.push(
            Notifications.getDefault().connect("notification-removed", (_, removedId) => {
                if(removedId !== this.#notification.id)
                    return;

                this.revealChild = false;
            }),
            Notifications.getDefault().connect("notification-replaced", (_, replacedId) => {
                if(replacedId !== this.#notification.id)
                    return;

                const newNotif = Notifications.getDefault().getNotifd()
                    .get_notification(replacedId)!;

                this.#widget.summary = newNotif.summary;
                this.#widget.body = newNotif.body;
                this.#widget.actions = newNotif.actions;
                this.#widget.appIcon = newNotif.appIcon;
                this.#widget.image = Notifications.getNotificationImage(newNotif) ?? null;
            })
        );

        
        void (
            <This this={this as FloatingNotification}>
                <This this={this.#widget}>
                    <Gtk.GestureClick onReleased={(gesture) => {
                        if(gesture.get_current_button() !== Gdk.BUTTON_PRIMARY)
                            return;

                        const mainAction = Notifications.getMainAction(this.notification.actions);
                        if(!mainAction) 
                            return;

                        mainAction && this.notification.invoke(mainAction.id);
                        Notifications.getDefault().removeNotification(this.notification.id);
                    }} />

                    <Gtk.EventControllerMotion onEnter={() => {
                        if(!generalConfig.getProperty("notifications.hold_on_hover", "boolean") ||
                              this.#notification.get_urgency() === AstalNotifd.Urgency.CRITICAL)
                            return;

                        Notifications.getDefault().holdNotification(this.notification.id);
                    }} onLeave={() => {
                        const dismissOnUnhover = generalConfig
                          .getProperty("notifications.dismiss_on_unhover", "boolean");

                        if(dismissOnUnhover) {
                            setTimeout(() => {
                                Notifications.getDefault().removeNotification(this.notification.id)
                            }, 600);

                            return;
                        }

                        Notifications.getDefault().releaseNotification(this.notification.id);
                    }}
                  />
                </This>
            </This>
        );
    }

    protected on_destroy(): void {
        for(const id of this.#notifConnections) {
            if(!GObject.signal_handler_is_connected(Notifications.getDefault(), id)) {
                Notifications.getDefault().disconnect(id);
            }
        }
    }

    /** TODO: make this slide to the sides(gtk is bugged so i don't really know how to fix this */
    protected getSlideAnimation(hPos: string, vPos: string): Gtk.RevealerTransitionType {
        switch(vPos) {
            case "top":
                return Gtk.RevealerTransitionType.SLIDE_DOWN;

            case "center": {
                switch(hPos) {
                    case "left":
                        return Gtk.RevealerTransitionType.SLIDE_RIGHT;

                    case "center":
                        return Gtk.RevealerTransitionType.SLIDE_UP;

                    default:
                        return Gtk.RevealerTransitionType.SLIDE_LEFT;
                }
            }

            default:
                return Gtk.RevealerTransitionType.SLIDE_UP;
        }
    }
}

export default FloatingNotification;
