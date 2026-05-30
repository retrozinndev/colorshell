import { Gtk } from "ags/gtk4";
import { Separator } from "./Separator";
import { getIconByAppName, getSymbolicIcon, lookupIcon } from "../modules/apps";
import { omitObjectKeys } from "../modules/utils";
import { Accessor, createBinding, createComputed, For } from "ags";
import { getter, gtype, property, register, signal } from "ags/gobject";
import AstalNotifd from "gi://AstalNotifd?version=0.1";
import Notifications from "../modules/notifications";
import Pango from "gi://Pango?version=1.0";
import GLib from "gi://GLib?version=2.0";
import Image from "./Image";
import Adw from "gi://Adw?version=1";
import Cache from "../modules/cache";
import GObject from "gi://GObject?version=2.0";


@register({ GTypeName: "ClshNotification" })
export class Notification extends Gtk.Box {
    declare readonly $signals: Notification.SignalSignatures;
    declare readonly $readableProperties: Notification.ReadableProperties;
    declare readonly $constructOnlyProperties: Notification.ConstructOnlyProperties;
    declare readonly $readWriteProperties: Notification.ReadWriteProperties;

    #id: number;

    @signal()
    dismissed() {}

    @signal(AstalNotifd.Action)
    actionClicked(_: AstalNotifd.Action) {}

    @getter(Number)
    get id() { return this.#id; }

    @property(String)
    summary: string;

    @property(gtype<string|null>(String))
    body: string|null = null;

    @property(gtype<string|null>(String))
    appName: string|null = null;

    @property(gtype<string|null>(String))
    appIcon: string|null = "application-x-executable-symbolic";

    @property(gtype<string|null>(String))
    image: string|null = null;

    @property(Array)
    actions: Array<AstalNotifd.Action> = [];

    @property(gtype<number|null>(Number))
    time: number|null = null;


    constructor(props: Partial<GObject.ConstructorProps<Notification>>) {
        super({
            cssName: "notification",
            ...omitObjectKeys(props, [
                "appName",
                "appIcon",
                "body",
                "summary",
                "actions",
                "time",
                "image",
                "id"
            ])
        } as GObject.ConstructorProps<Gtk.Box>);

        if(props.summary === undefined || props.id === undefined)
            throw new Error("Missing one or more of the obligatory properties: \"id\",\"summary\"");

        this.summary = props.summary;
        this.#id = props.id;

        if(props.body !== undefined)
            this.body = props.body;

        if(props.image !== undefined)
            this.image = props.image;

        if(props.appName !== undefined)
            this.appName = props.appName;

        if(props.appIcon !== undefined)
            this.appIcon = props.appIcon;

        if(props.actions !== undefined)
            this.actions = props.actions;

        if(props.time !== undefined)
            this.time = props.time;

        this.set_orientation(Gtk.Orientation.VERTICAL);
        this.set_spacing(5);

        const cachedImage = Cache.getDefault().getItem<Image.CacheData>("notifications", this.id.toString());

        if(!cachedImage) {
            const id = Notifications.getDefault().connect("history-removed", (_, notif) => {
                if(notif !== this.id)
                    return;

                Notifications.getDefault().disconnect(id);
                Cache.getDefault().removeItem("notifications", notif.toString());
            });
        }

        this.prepend(
            <Gtk.CenterBox class={"top"} hexpand>
                <Gtk.Box $type="start">
                    <Gtk.Image class={"app-icon"} iconName={createComputed([
                        createBinding(this, "appName"),
                        createBinding(this, "appIcon")
                    ], (name, icon) => {
                        if(icon && lookupIcon(icon))
                            return icon;

                        if(name === null)
                            return "application-x-executable-symbolic";

                        return getSymbolicIcon(name) ?? getIconByAppName(name) ??
                            "application-x-executable-symbolic";
                    })} />
                    <Gtk.Label xalign={0} class={"app-name"} label={
                        createBinding(this, "appName").as(s => s ?? "unknown-app")
                    } />
                </Gtk.Box>
                <Gtk.Box $type="end">
                    <Gtk.Label class={"time"} visible={createBinding(this, "time").as(t => Boolean(t ?? true))}
                      label={createBinding(this, "time").as(t => t !== null ?
                          GLib.DateTime.new_from_unix_local(t).format("%H:%M")!
                      : "")}
                      xalign={1}
                    />
                    <Gtk.Button iconName={"window-close-symbolic"} class={"close"}
                      onClicked={() => this.emit("dismissed")}
                    />
                </Gtk.Box>
            </Gtk.CenterBox> as Gtk.CenterBox
        );

        this.append(
            <Separator alpha={.1} orientation={Gtk.Orientation.VERTICAL} /> as Gtk.Widget
        );

        this.append(
            <Gtk.Box class={"content"}>
                <Adw.Clamp maximumSize={80}>
                    <Image cache={["notifications", this.id.toString()]} hideIfEmpty
                      valign={Gtk.Align.START}
                      path={createBinding(this, "image")(img => {
                          if(!img?.startsWith('/'))
                              return null;

                          return img;
                      }) as Accessor<string>}
                      $={self => {
                          self.picture.set_content_fit(Gtk.ContentFit.COVER);
                          self.picture.set_keep_aspect_ratio(false);
                      }}
                    />
                </Adw.Clamp>
                <Gtk.Box class={"text"} orientation={Gtk.Orientation.VERTICAL} vexpand>
                    <Gtk.Label xalign={0} class={"summary"} hexpand vexpand={false}
                      ellipsize={Pango.EllipsizeMode.END} label={createBinding(this, "summary")}
                      valign={Gtk.Align.START}
                    />
                    <Gtk.Label xalign={0} class={"body"} visible={createBinding(this, "body").as(s => s !== null)}
                      label={createBinding(this, "body").as(s => s ?? "")} useMarkup
                      valign={Gtk.Align.START} wrapMode={Pango.WrapMode.WORD_CHAR} wrap
                    />
                </Gtk.Box>
            </Gtk.Box> as Gtk.Box
        );

        this.append(
            <Gtk.Box class={"actions"} orientation={Gtk.Orientation.VERTICAL}>
                <For each={createBinding(this, "actions")} >
                    {(action: AstalNotifd.Action) => {
                        return <Gtk.Button class={"action"} label={action.label} hexpand
                          onClicked={() => this.emit("action-clicked", action)}
                        />;
                    }}
                </For>
            </Gtk.Box> as Gtk.Box
        );
    }
}

export namespace Notification {
    export interface SignalSignatures extends Gtk.Box.SignalSignatures {
        "notify::summary": () => void;
        "notify::body": () => void;
        "notify::app-icon": () => void;
        "notify::app-name": () => void;
        "notify::actions": () => void;
        "notify::time": () => void;
        "notify::image": () => void;

        "dismissed": () => void;
        "action-clicked": (action: AstalNotifd.Action) => void;
    }

    export interface ReadableProperties extends Gtk.Box.ReadableProperties {
        "id": number;
    }

    export interface ConstructOnlyProperties extends Gtk.Box.ConstructOnlyProperties {
        "id": number;
    }
    
    export interface ReadWriteProperties extends Gtk.Box.ReadWriteProperties {
        "summary": string;
        "body": string;
        "app-icon": string;
        "app-name": string;
        "actions": Array<AstalNotifd.Action>;
        "time": number;
        "image": string;
    }
}
