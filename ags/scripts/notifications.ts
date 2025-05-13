import { AstalIO, execAsync, Gio, GObject, property, register, signal, timeout } from "astal";
import AstalNotifd from "gi://AstalNotifd";

export let 
    NOTIFICATION_TIMEOUT_URGENT: number = 0,
    NOTIFICATION_TIMEOUT_NORMAL: number = 4000,
    NOTIFICATION_TIMEOUT_LOW: number = 2000;

export interface HistoryNotification {
    id: number;
    appName: string;
    body: string;
    summary: string;
    urgency: AstalNotifd.Urgency;
    appIcon?: string;
    time: number;
    image?: string;
}

@register({ GTypeName: "Notifications" })
class Notifications extends GObject.Object {
    private static instance: (Notifications|null) = null;

    #notifications: Array<AstalNotifd.Notification> = [];
    #history: Array<HistoryNotification> = [];
    #notificationsOnHold: Set<number> = new Set<number>();
    #connections: Array<number> = [];
    #historyLimit: number = 10;


    @property()
    public get notifications() { return this.#notifications };

    @property()
    public get history() { return this.#history };

    @property()
    public get historyLimit() { return this.#historyLimit };

    public set historyLimit(newValue: number) {
        this.#historyLimit = newValue;
        this.notify("historyLimit");
    }


    @signal(AstalNotifd.Notification)
    declare notificationAdded: (notification: AstalNotifd.Notification) => void;

    @signal(Number)
    declare notificationRemoved: (id: number) => void;

    @signal(Object) // It's an Object, beacuase HistoryNotification is just an interface
    declare historyAdded: (notification: AstalNotifd.Notification) => void;

    @signal(Number)
    declare historyRemoved: (id: number) => void;

    @signal(Number)
    declare notificationReplaced: (id: number) => void;


    constructor() {
        super();

        this.#connections.push(
            AstalNotifd.get_default().connect("notified", (notifd, id) => {
                const notification = notifd.get_notification(id);
                const notifTimeout = notification.urgency === AstalNotifd.Urgency.LOW ? 
                    NOTIFICATION_TIMEOUT_LOW 
                : (notification.urgency === AstalNotifd.Urgency.CRITICAL ? 
                   NOTIFICATION_TIMEOUT_URGENT
                : NOTIFICATION_TIMEOUT_NORMAL);

                if(this.getNotifd().dontDisturb) {
                    this.addHistory(notification, () => notification.dismiss());
                    return;
                }

                this.addNotification(notification, () => {
                    if(notification.urgency !== AstalNotifd.Urgency.CRITICAL ||
                      (notification.urgency === AstalNotifd.Urgency.CRITICAL && 
                        NOTIFICATION_TIMEOUT_URGENT > 0)) {

                        let notifTimer: (AstalIO.Time|undefined) = undefined;
                        let replacedConnectionId: number;

                        const removeFun = () => { // Funny name haha lmao remove fun :skull:
                            notifTimer = undefined;
                            if(this.#notificationsOnHold.has(notification.id)) return;

                            this.addHistory(notification, () => {
                                replacedConnectionId && this.disconnect(replacedConnectionId);
                                this.removeNotification(id);
                            });
                        }

                        notifTimer = timeout(notifTimeout, removeFun);

                        replacedConnectionId = this.connect("notification-replaced", (_, id: number) => {
                            if(notification.id === id) {
                                notifTimer?.cancel();
                                notifTimer = timeout(notifTimeout, removeFun);
                            }
                        });
                    }
                });
            }),

            AstalNotifd.get_default().connect("resolved", (notifd, id, _reason) => {
                this.removeNotification(id);
                this.addHistory(notifd.get_notification(id));
            })
        );

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

    public async sendNotification(props: {
                urgency?: AstalNotifd.Urgency;
                appName?: string;
                image?: string;
                summary: string;
                body?: string;
                replaceId?: number;
                actions?: Array<{
                    id?: (string|number);
                    text: string;
                    onAction?: () => void
                }>
            }): Promise<{
                    id?: (string|number);
                    text: string;
                    onAction?: () => void
                }|null|void> {

        return await execAsync([
            "notify-send", 
                     ...(props.urgency ? [
                "-u", this.getUrgencyString(props.urgency)
            ] : []), ...(props.appName ? [
                "-a", props.appName
            ] : []), ...(props.image ? [
                "-i", props.image
            ] : []), ...(props.actions ? props.actions.map((action) =>
                [ "-A", action.text ]
            ).flat(2) : []), ...(props.replaceId ? [
                "-r", props.replaceId.toString()
            ] : []), props.summary, props.body ? props.body : ""
        ]).then((stdout) => {
            stdout = stdout.trim();
            if(!stdout) {
                if(props.actions && props.actions.length > 0)
                    return null;

                return;
            }

            if(props.actions && props.actions.length > 0) {
                const action = props.actions[Number.parseInt(stdout)];
                action?.onAction?.();

                return action ?? undefined;
            }
        }).catch((err: Gio.IOErrorEnum) => {
            console.error(`Notifications: Couldn't send notification! Is the daemon running? Stderr:\n${
                err.message ? `${err.message}\n` : ""}Stack: ${err.stack}`);
        });
    }

    public getUrgencyString(urgency: AstalNotifd.Notification|AstalNotifd.Urgency) {
        switch((urgency instanceof AstalNotifd.Notification) ? 
               urgency.urgency : urgency) {

            case AstalNotifd.Urgency.LOW: 
                return "low";
            case AstalNotifd.Urgency.CRITICAL: 
                return "critical";
        }

        return "normal";
    }

    private addHistory(notif: AstalNotifd.Notification, onAdded?: (notif: AstalNotifd.Notification) => void): void {
        if(!notif) return;

        this.#history.length === this.#historyLimit &&
            this.removeHistory(this.#history[this.#history.length - 1]);

        this.#history.map((notifb, i) => 
            notifb.id === notif.id && this.#history.splice(i, 1));

        this.#history.unshift({
            id: notif.id,
            appName: notif.appName,
            body: notif.body,
            summary: notif.summary,
            urgency: notif.urgency,
            appIcon: notif.appIcon,
            time: notif.time,
            image: notif.image ? notif.image : undefined
        } as HistoryNotification);

        this.notify("history");
        this.emit("history-added", this.#history[0]);
        onAdded && onAdded(notif);
    }

    public clearHistory(): void {
        const hist = this.#history.reverse();
        hist.map((notif) => {
            this.#history = this.history.filter((n) => n.id !== notif.id);
            this.emit("history-removed", notif.id);
            this.notify("history");
        });
    }

    public removeHistory(notif: (HistoryNotification|number)): void {
        const notifId = (typeof notif === "number") ? notif : notif.id;
        this.#history = this.#history.filter((item: HistoryNotification) => 
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
        const notificationId = (notif instanceof AstalNotifd.Notification) ? notif.id : notif;
        this.#notificationsOnHold.has(notificationId) && 
            this.#notificationsOnHold.delete(notificationId);

        this.#notifications = this.#notifications.filter((item: AstalNotifd.Notification) =>
            item.id !== notificationId);

        AstalNotifd.get_default().get_notification(notificationId)?.dismiss();
        this.notify("notifications");
        this.emit("notification-removed", notificationId);
    }

    private getNotificationById(id: number): AstalNotifd.Notification|undefined {
        return this.#notifications.filter(notif => notif.id === id)?.[0];
    }

    public holdNotification(notif: (AstalNotifd.Notification|number)): void {
        notif = (typeof notif === "number") ? 
            this.getNotificationById(notif)!
        : notif;

        if(!notif) return;

        this.#notificationsOnHold.add(notif.id);
    }

    public toggleDoNotDisturb(): boolean {
        if(AstalNotifd.get_default().dontDisturb) {
            AstalNotifd.get_default().dontDisturb = false;
            return false;
        }

        AstalNotifd.get_default().dontDisturb = true;
        return true;
    }

    public getNotifd(): AstalNotifd.Notifd { return AstalNotifd.get_default(); }

    connect(signal: string, callback: (...args: any[]) => void): number {
        return super.connect(signal, callback);
    }

    disconnect(id: number) {
        super.disconnect(id);
    }
}

export { Notifications };
