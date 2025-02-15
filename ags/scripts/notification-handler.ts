import AstalNotifd from "gi://AstalNotifd";
import { timeout } from "astal/time";
import { Connectable } from "astal/binding";
import { GObject, register, signal } from "astal";
import { Windows } from "../windows";

@register({ GTypeName: "Notifications" })
class NotificationsClass extends GObject.Object implements Connectable {

    private static instance: NotificationsClass;
    private notifd: AstalNotifd.Notifd;

    public notifications: Array<AstalNotifd.Notification> = [];
    public notificationHistory: Array<AstalNotifd.Notification> = [];

    @signal(AstalNotifd.Notification)
    declare notificationAdded: (added: AstalNotifd.Notification) => void;

    @signal(Number)
    declare notificationRemoved: (id: number) => void;


    public static getDefault(): NotificationsClass {
        if(!NotificationsClass.instance) { 
            NotificationsClass.instance = new NotificationsClass();
            this.instance._init();
        }

        return NotificationsClass.instance;
    }

    constructor() { 
        super();
        this.notifd = new AstalNotifd.Notifd({
            ignoreTimeout: true,
            dontDisturb: false
        } as AstalNotifd.Notifd.ConstructorProps);

        this.getNotifd().connect("notified", (_source: AstalNotifd.Notifd, id: number, _replaced: boolean) => {
            this.addNotification(this.getNotifd().get_notification(id));
        });
    }

    public addNotification(notification: AstalNotifd.Notification) {
        this.prependArray(this.notifications, this.getNotifd().get_notification(notification.id));

        // default timeout if undefined
        let notificationTimeout = 4000;

        switch(notification.urgency) {
            case AstalNotifd.Urgency.LOW:
                notificationTimeout = 2000;
                break;
            case AstalNotifd.Urgency.NORMAL:
                notificationTimeout = 4000;
                break;
        }

        notification.urgency !== AstalNotifd.Urgency.CRITICAL ? 
            timeout(notificationTimeout, () => {
                    this.notifications.map((item: AstalNotifd.Notification) =>
                        item.id === notification.id && (() => {
                            this.removeNotification(notification.id);
                            this.addToNotificationHistory(notification);
                        })())
            }) 
        : this.addToNotificationHistory(notification);

        this.emit("notification-added", notification);
    }

    public removeNotification(notificationId: number) {
        if(this.notifications.length === 1) 
            Windows.close(Windows.getWindow("floating-notifications")!);

        this.notifications = this.notifications.filter((notification: AstalNotifd.Notification) => 
            notification.id !== notificationId);

        this.emit("notification-removed", notificationId);
    }

    public addToNotificationHistory(notification: AstalNotifd.Notification) {
        this.prependArray(this.notificationHistory, notification);
    }

    public removeFromNotificationHistory(notificationId: number) {
        this.notificationHistory = this.notificationHistory.filter((curNotification: AstalNotifd.Notification) => 
            curNotification.id !== notificationId);
    }

    private prependArray(array: Array<any>, item: any): Array<any> {
        let tmpArray = array.reverse();
        tmpArray.push(item);
        return tmpArray.reverse();
    }

    public getNotifd(): AstalNotifd.Notifd {
        return this.notifd;
    }
}

export const Notifications = new NotificationsClass();
