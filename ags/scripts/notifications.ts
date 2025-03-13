import { AstalIO, GObject, property, register, signal, timeout } from "astal";
import AstalNotifd from "gi://AstalNotifd";

export const 
    NOTIFICATION_TIMEOUT_URGENT: number = 0,
    NOTIFICATION_TIMEOUT_NORMAL: number = 4000,
    NOTIFICATION_TIMEOUT_LOW: number = 2000;

@register({ GTypeName: "Notifications" })
class Notifications extends GObject.Object {
    private static instance: (Notifications|null) = null;

    #notifications: Array<AstalNotifd.Notification> = [];
    #history: Array<AstalNotifd.Notification> = [];
    #connections: Array<number>;


    @property()
    public get notifications() { return this.#notifications };

    @property()
    public get history() { return this.#history };


    @signal(AstalNotifd.Notification)
    declare notificationAdded: (notification: AstalNotifd.Notification) => void;

    @signal(Number)
    declare notificationRemoved: (id: number) => void;

    @signal(AstalNotifd.Notification)
    declare historyAdded: (notification: AstalNotifd.Notification) => void;

    @signal(Number)
    declare historyRemoved: (id: number) => void;

    @signal(Number)
    declare notificationReplaced: (id: number) => void;


    constructor() {
        super();

        this.#connections = [
            AstalNotifd.get_default().connect("notified", (notifd, id, _replaced) => {
                const notification = notifd.get_notification(id);
                const notifTimeout = notification.urgency === AstalNotifd.Urgency.LOW ? 
                    NOTIFICATION_TIMEOUT_LOW 
                : (notification.urgency === AstalNotifd.Urgency.CRITICAL ? 
                   NOTIFICATION_TIMEOUT_URGENT
                : NOTIFICATION_TIMEOUT_NORMAL);

                this.addNotification(notification, () => {
                    if(notification.urgency !== AstalNotifd.Urgency.CRITICAL ||
                      (notification.urgency === AstalNotifd.Urgency.CRITICAL && 
                        NOTIFICATION_TIMEOUT_URGENT > 0)) {

                        let notifTimer: AstalIO.Time;
                        let replacedConnectionId: number;
                        const removeFun = () => { // Funny name haha lmao remove fun :skull:
                            this.removeNotification(id);
                            replacedConnectionId && this.disconnect(replacedConnectionId);
                        }

                        replacedConnectionId = this.connect("notification-replaced", (_, id: number) => {
                            if(notification.id === id) {
                                notifTimer.cancel();
                                notifTimer = timeout(notifTimeout, removeFun);
                            }
                        });

                        notifTimer = timeout(notifTimeout, removeFun);
                    }
                });
            }),
            AstalNotifd.get_default().connect("resolved", (notifd, id, _reason) => {
                this.removeNotification(id);
                this.addHistory(notifd.get_notification(id));
            })
        ];

        this.run_dispose = () => {
            super.run_dispose();
            this.#connections.map((id: number) => 
                AstalNotifd.get_default().disconnect(id));
        };
    }

    public static getDefault(): Notifications {
        if(!this.instance)
            this.instance = new Notifications();

        return this.instance;
    }

    private addHistory(notif: AstalNotifd.Notification, onAdded?: (notif: AstalNotifd.Notification) => void): void {
        const newArray = this.#history.reverse().filter((item) => item.id !== notif.id);
        newArray.push(notif);
        this.#history = newArray.reverse();
        this.notify("history");
        this.emit("history-added", notif);
        onAdded && onAdded(notif);
    }

    public removeHistory(notif: (AstalNotifd.Notification|number)): void {
        const notifId = (notif instanceof AstalNotifd.Notification) ? notif.id : notif;
        this.#history = this.#history.filter((item: AstalNotifd.Notification) => 
            item.id !== notifId);

        this.notify("history");
        this.emit("history-removed", notifId);
    }

    private addNotification(notif: AstalNotifd.Notification, onAdded?: (notif: AstalNotifd.Notification) => void): void {
        const newArray = this.#notifications.reverse().filter((item) => item.id !== notif.id);
        if(newArray !== this.notifications) {
            this.emit("notification-replaced", notif.id);
        }

        newArray.push(notif);
        this.#notifications = newArray.reverse();
        this.notify("notifications");
        this.emit("notification-added", notif);
        onAdded && onAdded(notif);
    }

    public removeNotification(notif: (AstalNotifd.Notification|number)): void {
        const notification = (notif instanceof AstalNotifd.Notification) ? notif : AstalNotifd.get_default().get_notification(notif);
        this.#notifications = this.#notifications.filter((item: AstalNotifd.Notification) =>
            item.id !== notification.id);

        notification.dismiss();
        this.notify("notifications");
        this.emit("notification-removed", notification.id);
    }

    public toggleDoNotDisturb(): boolean {
        if(AstalNotifd.get_default().dontDisturb) {

        }
    }

    connect(signal: string, callback: (...args: any[]) => void): number {
        return super.connect(signal, callback);
    }

    disconnect(id: number) {
        super.disconnect(id);
    }
}

export { Notifications };
