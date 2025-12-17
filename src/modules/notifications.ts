import { execAsync } from "ags/process";
import { generalConfig } from "../config";
import { onCleanup } from "ags";
import GObject, { getter, ParamSpec, property, register, signal } from "ags/gobject";

import AstalNotifd from "gi://AstalNotifd";
import GLib from "gi://GLib?version=2.0";
import { pathToURI } from "./utils";


export type HistoryNotification = {
    id: number;
    appName: string;
    body: string;
    summary: string;
    urgency: AstalNotifd.Urgency;
    appIcon?: string;
    time: number;
    image?: string;
}

export class NotificationTimeout {
    #source?: GLib.Source;
    #args?: Array<any>;
    #millis: number;
    #lastRemained: number = 0;

    readonly callback: () => void;
    get millis(): number { return this.#millis; }
    get remaining(): number { return this.source!.get_time() }
    get lastRemained(): number { return this.#lastRemained; }
    get running(): boolean { return Boolean(this.source?.is_destroyed()); }
    get source(): GLib.Source|undefined { return this.#source; }

    constructor(millis: number, callback: () => void, start: boolean = true, ...args: Array<any>) {
        this.#millis = millis;
        this.callback = callback;
        this.#args = args;

        if(!start) return;
        this.start();
    }

    cancel(): void {
        // use lastRemained to calculate on what time the user hold the notification, so it
        // can be released by the remaining time (works like a timeout "pause")
        if(!this.#source) 
            return;

        this.#lastRemained = Math.floor(Math.max(this.#source.get_ready_time() - GLib.get_monotonic_time()) / 1000);
        this.#source.destroy();
        this.#source.unref();
        this.#source = undefined;
    }

    start(newMillis?: number): GLib.Source {
        if(this.running || this.#source)
            throw new Error("Notifications: Can't start a new counter if it's already running!");

        if(newMillis !== undefined)
            this.#millis = newMillis;

        this.#source = setTimeout(
            this.callback,
            this.#millis,
            this.#args
        );

        this.#lastRemained = Math.floor(Math.max(this.#source.get_ready_time() - GLib.get_monotonic_time()) / 1000);

        return this.#source;
    }
};

@register({ GTypeName: "Notifications" })
export class Notifications extends GObject.Object {
    private static instance: (Notifications|null) = null;

    declare $signals: GObject.Object.SignalSignatures & {
        "history-added": (notification: HistoryNotification) => void;
        "history-removed": (notificationId: number) => void;
        "history-cleared": () => void;
        "notification-added": (notification: AstalNotifd.Notification) => void;
        "notification-removed": (notificationId: number) => void;
        "notification-replaced": (notificationId: number) => void;
    };

    #notifications = new Map<number, [AstalNotifd.Notification, NotificationTimeout]>();
    #history: Array<HistoryNotification> = [];
    #connections: Array<number> = [];

    @getter(Array<AstalNotifd.Notification>)
    public get notifications() {
        return [...this.#notifications.values()].map(([n]) => n);
    };

    @getter(Array<HistoryNotification>)
    public get history() { return this.#history };

    @getter(Array<AstalNotifd.Notification>)
    public get notificationsOnHold() {
        return [...this.#notifications.values()].filter(([_, s]) => 
            typeof s === "undefined"
        ).map(([n]) => n);
    }

    @property(Number)
    public historyLimit: number = 10;

    /** skip notifications directly to notification history */
    @property(Boolean)
    public ignoreNotifications: boolean = false;


    @signal(AstalNotifd.Notification) notificationAdded(_notification: AstalNotifd.Notification) {};
    @signal(Number) notificationRemoved(_id: number) {};
    @signal(Object as unknown as ParamSpec<HistoryNotification>) historyAdded(_notification: Object) {};
    @signal() historyCleared() {};
    @signal(Number) historyRemoved(_id: number) {};
    @signal(Number) notificationReplaced(_id: number) {};

    constructor() {
        super();

        this.#connections.push(
            AstalNotifd.get_default().connect("notified", (notifd, id) => {
                const notification = notifd.get_notification(id);
                
                if(this.getNotifd().dontDisturb || this.ignoreNotifications) {
                    this.addHistory(notification, () => notification.dismiss());
                    return;
                }

                this.addNotification(notification, this.getNotificationTimeout(notification) > 0);
            }),

            AstalNotifd.get_default().connect("resolved", (notifd, id, _reason) => {
                this.removeNotification(id);
                this.addHistory(notifd.get_notification(id));
            })
        );

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
        onAdded?.(notif);
    }

    public async clearHistory(): Promise<void> {
        this.#history.reverse().map((notif) => {
            this.#history = this.history.filter((n) => n.id !== notif.id);
            this.emit("history-removed", notif.id);
        });

        this.emit("history-cleared");
        this.notify("history");
    }

    public removeHistory(notif: (HistoryNotification|number)): void {
        const notifId = (typeof notif === "number") ? notif : notif.id;
        this.#history = this.#history.filter((item: HistoryNotification) => 
            item.id !== notifId);

        this.notify("history");
        this.emit("history-removed", notifId);
    }

    private addNotification(
        notif: AstalNotifd.Notification, 
        removeOnTimeout: boolean = true, 
        onTimeoutEnd?: () => void
    ): void {

        const replaced = this.#notifications.has(notif.id);
        const notifTimeout = this.getNotificationTimeout(notif);
        const onEnd = () => {
            removeOnTimeout && this.removeNotification(notif);
            onTimeoutEnd?.();
        }

        // destroy timer of replaced notification(if there's any)
        if(replaced) {
            const data = this.#notifications.get(notif.id)!;
            (data?.[1] instanceof NotificationTimeout) && 
                data[1].cancel();
        }
        
        this.#notifications.set(notif.id, [
            notif, 
            new NotificationTimeout(notifTimeout, onEnd, notifTimeout > 0)
        ]);

        replaced && this.emit("notification-replaced", notif.id);

        this.notify("notifications");
        this.emit("notification-added", notif);

        if(notifTimeout <= 0) onEnd?.();
    }

    public getNotificationTimeout(notif: AstalNotifd.Notification): number {
        return generalConfig.getProperty(
            `notifications.timeout_${this.getUrgencyString(notif.urgency)}`, 
            "number"
        );
    }

    public removeNotification(notif: (AstalNotifd.Notification|number), addToHistory: boolean = true): void {
        notif = typeof notif === "number" ? 
            this.#notifications.get(notif)?.[0]!
        : notif;

        if(!notif) return;

        const timeout = this.#notifications.get(notif.id)?.[1];
        timeout?.running && timeout.cancel();

        this.#notifications.delete(notif.id);
        addToHistory && this.addHistory(notif);

        notif.dismiss();
        this.notify("notifications");
        this.emit("notification-removed", notif.id);
    }

    public holdNotification(notif: AstalNotifd.Notification|number): void {
        const id = typeof notif === "number" ? notif : notif.id;
        const data = this.#notifications.get(id);

        if(!data) return;

        data[1]?.cancel();
        this.notify("notifications-on-hold");
    }

    public releaseNotification(notif: AstalNotifd.Notification|number): void {
        const id = typeof notif === "number" ? notif : notif.id;
        const data = this.#notifications.get(id);

        if(!data) return;
        data[1]?.start(data[1].lastRemained); 

        this.notify("notifications-on-hold");
    }

    public getNotificationImage(notif: AstalNotifd.Notification|HistoryNotification): string|undefined {
        const img = notif.image || notif.appIcon;

        if(!img || !img.includes('/')) 
            return undefined;

        return pathToURI(img).replace("file://", "");
    }

    public removeDuplicateActions(actions: Array<AstalNotifd.Action>): Array<AstalNotifd.Action> {
        const finalActions: Array<AstalNotifd.Action> = [...actions];

        for(let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const lastIndex = finalActions.findLastIndex(a => a.id === action.id);
            
            if(lastIndex !== i) {
                finalActions.splice(lastIndex, 1);
                continue;
            }
        }

        return finalActions;
    }

    public toggleDoNotDisturb(value?: boolean): boolean {
        value = value ?? !AstalNotifd.get_default().dontDisturb;
        AstalNotifd.get_default().dontDisturb = value;

        return value;
    }

    public getNotifd(): AstalNotifd.Notifd { return AstalNotifd.get_default(); }

    public emit<Signal extends keyof typeof this.$signals>(
        signal: Signal, ...args: Parameters<(typeof this.$signals)[Signal]>
    ): void {
        super.emit(signal, ...args);
    }

    public connect<Signal extends keyof typeof this.$signals>(
        signal: Signal, 
        callback: (self: typeof this, ...params: Parameters<(typeof this.$signals)[Signal]>) => 
            ReturnType<(typeof this.$signals)[Signal]>
    ): number {
        return super.connect(signal, callback);
    }
}
