import { timeout } from "ags/time";
import { execAsync } from "ags/process";
import { readFile } from "ags/file";
import { generalConfig } from "../app";
import { onCleanup } from "ags";
import GObject, { getter, property, register, signal } from "ags/gobject";

import AstalNotifd from "gi://AstalNotifd";
import AstalIO from "gi://AstalIO";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


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

    @getter(Array<AstalNotifd.Notification>)
    public get notifications() { return this.#notifications };

    @getter(Array<HistoryNotification>)
    public get history() { return this.#history };

    @property(Number)
    public historyLimit: number = 10;


    @signal(AstalNotifd.Notification) notificationAdded(_notification: AstalNotifd.Notification) {};
    @signal(Number) notificationRemoved(_id: number) {};
    @signal(Object) historyAdded(_notification: Object) {};
    @signal(Number) historyRemoved(_id: number) {};
    @signal(Number) notificationReplaced(_id: number) {};

    constructor() {
        super();

        this.#connections.push(
            AstalNotifd.get_default().connect("notified", (notifd, id) => {
                const notification = notifd.get_notification(id);
                const notifTimeout = generalConfig.getProperty(
                    `notifications.timeout_${this.getUrgencyString(notification.urgency).toLowerCase()}`, 
                    "number") as number;

                if(this.getNotifd().dontDisturb) {
                    this.addHistory(notification, () => notification.dismiss());
                    return;
                }

                this.addNotification(notification, () => {
                    if(notification.urgency !== AstalNotifd.Urgency.CRITICAL ||
                      (notification.urgency === AstalNotifd.Urgency.CRITICAL && 
                        notifTimeout > 0)) {

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
                            if(notification.id !== id) return;

                            notifTimer?.cancel();
                            notifTimer = timeout(notifTimeout, removeFun);
                        });
                    }
                });
            }),

            AstalNotifd.get_default().connect("resolved", (notifd, id, _reason) => {
                this.removeNotification(id);
                this.addHistory(notifd.get_notification(id));
            })
        );

        this.retrieveHistoryFromFile();

        onCleanup(() => {
            this.#connections.map(id => 
                AstalNotifd.get_default().disconnect(id));
        });
    }

    public static getDefault(): Notifications {
        if(!this.instance)
            this.instance = new Notifications();

        return this.instance;
    }

    private retrieveHistoryFromFile(): void {
        const historyFile = Gio.File.new_for_path(`${GLib.get_user_state_dir()}/astal/notifd/notifications.json`);
        if(!historyFile.query_exists(null)) return;

        let content: string;
        console.log("Notifications: History file found! Trying to retrieve history from JSON");

        try {
            content = readFile(historyFile.get_path()!);
        } catch(e: any) {
            console.error(`Notifications: An error occurred while trying to read the history file. Stderr:\n${
                (e as Error).message}\n${(e as Error).stack}`);

            return;
        }

        try {
            const historyJSON = JSON.parse(content);

            (historyJSON["notifications"] as Array<AstalNotifd.Notification>).reverse()
                .forEach(n => this.addHistory(n));
        } catch(e: any) {
            if(e instanceof SyntaxError) {
                console.error(`Notifications: Couldn't parse history JSON because of a SyntaxError:\n${e.message
                }\n${e.stack}`);

                return;
            }

            console.error(`Notifications: An error occurred while parsing the history JSON file. Stderr:\n${
                e.message}\n${e.stack}`);

            return;
        }
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
        }).catch((err: Error) => {
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

        this.#history.length === this.historyLimit &&
            this.removeHistory(this.#history[this.#history.length - 1]);

        this.#history.map((notifb, i) => 
            notifb.id === notif.id && this.#history.splice(i, 1));

        this.#history.unshift({
            id: notif.id,
            appName: notif.app_name,
            body: notif.body,
            summary: notif.summary,
            urgency: notif.urgency,
            appIcon: notif.app_icon,
            time: notif.time,
            image: notif.image ? notif.image : undefined
        } as HistoryNotification);

        this.notify("history");
        this.emit("history-added", this.#history[0]);
        onAdded && onAdded(notif);
    }

    public async clearHistory(): Promise<void> {
        this.#history.reverse().map((notif) => {
            this.#history = this.history.filter((n) => n.id !== notif.id);
            this.emit("history-removed", notif.id);
        });

        this.notify("history");
    }

    public removeHistory(notif: (HistoryNotification|number)): void {
        const notifId = (typeof notif === "number") ? notif : notif.id;
        this.#history = this.#history.filter((item: HistoryNotification) => 
            item.id !== notifId);

        this.notify("history");
        this.emit("history-removed", notifId);
    }

    private addNotification(notif: AstalNotifd.Notification, onAdded?: (notif: AstalNotifd.Notification) => void): void {
        for(let i = 0; i < this.#notifications.length; i++) {
            const item = this.#notifications[i];

            if(item.id !== notif.id) continue;

            this.#notifications.splice(i, 1);
            this.emit("notification-replaced", item.id);
            break;
        }

        this.#notifications.unshift(notif);
        this.notify("notifications");
        this.emit("notification-added", notif);
        onAdded?.(notif);
    }

    public removeNotification(notif: (AstalNotifd.Notification|number)): void {
        const notificationId = (notif instanceof AstalNotifd.Notification) ? notif.id : notif;
        this.#notificationsOnHold.delete(notificationId);

        this.#notifications = this.#notifications.filter((item) =>
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

    public toggleDoNotDisturb(value?: boolean): boolean {
        value = value ?? !AstalNotifd.get_default().dontDisturb;
        AstalNotifd.get_default().dontDisturb = value;

        return value;
    }

    public getNotifd(): AstalNotifd.Notifd { return AstalNotifd.get_default(); }
}

export { Notifications };
