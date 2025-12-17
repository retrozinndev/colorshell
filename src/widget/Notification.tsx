import { Gdk, Gtk } from "ags/gtk4";
import { Separator } from "./Separator";
import { Cache } from "../modules/cache";
import { Notifications } from "../modules/notifications";
import { getIconByAppName, getSymbolicIcon, lookupIcon } from "../modules/apps";
import { createScopedConnection, omitObjectKeys, pathToURI } from "../modules/utils";
import { createBinding, createComputed, For } from "ags";
import { getter, gtype, property, register, signal } from "ags/gobject";

import AstalNotifd from "gi://AstalNotifd";
import Pango from "gi://Pango?version=1.0";
import GLib from "gi://GLib?version=2.0";
import Adw from "gi://Adw?version=1";
import Gly from "gi://Gly?version=2";
import Gio from "gi://Gio?version=2.0";
import GlyGtk4 from "gi://GlyGtk4?version=2";


@register({ GTypeName: "ClshNotification" })
export class Notification extends Gtk.Box {
    declare $signals: Notification.SignalSignatures;

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


    constructor(props: Notification.ConstructorProps) {
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
        });

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
                <Adw.Clamp orientation={Gtk.Orientation.VERTICAL} maximumSize={78} valign={Gtk.Align.START}>
                    <Gtk.Stack class={"image-stack"} visible={createBinding(this, "image")
                        .as(img => img !== null)
                      } transitionType={Gtk.StackTransitionType.CROSSFADE}
                      transitionDuration={360}
                      $={(self) => {
                          self.add_named(new Adw.Spinner(), "spinner");
                          !this.isValidString(this.image) &&
                              self.hide();

                          // [path, texture]
                          type NotifImageCache = [string, Gdk.Texture];

                          function buildPicture(texture: Gdk.Texture): void {
                              self.show();
                              const picture = self.get_child_by_name("picture") as Gtk.Picture|null;

                              if(picture) {
                                  picture.set_paintable(texture);
                                  self.set_visible_child_name("picture");
                                  return;
                              }

                              self.add_named(
                                  <Gtk.Picture paintable={texture} canShrink
                                    contentFit={Gtk.ContentFit.COVER} hexpand={false}
                                    vexpand={false}
                                  /> as Gtk.Picture,
                                  "picture"
                              );
                              self.set_visible_child_name("picture");
                          }

                          function panic() { // this is so funny lol
                              self.hide();
                              const pic = self.get_child_by_name("picture");
                              pic && self.remove(pic);
                          }

                          const loadImage = () => {
                              if(!this.isValidString(this.image))
                                  return;

                              self.set_visible_child_name("spinner");

                              // check if it's an icon (for example, Valent(kde-connect reimplementation using gobject) sends icon names as images)
                              if(!this.image.includes('/')) {
                                  if(!lookupIcon(this.image)) {
                                      console.error(`"Failed to get icon from image for notification: icon not found with icon name \"${
                                          this.image}\"`
                                      );
                                      return;
                                  }

                                  const picture = self.get_child_by_name("picture") as Gtk.Picture|null ?? 
                                      <Gtk.Picture canShrink contentFit={Gtk.ContentFit.COVER} /> as Gtk.Picture;

                                  const paintable = Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
                                      .lookup_icon(
                                          this.image, null, 64, self.scaleFactor, Gtk.TextDirection.LTR, Gtk.IconLookupFlags.NONE
                                      );

                                  paintable && picture.set_paintable(paintable);
                                  return;
                              }

                              const cached = Cache.getDefault().getItem<NotifImageCache>("notifications", this.id.toString());

                              if(cached && cached[0] === this.image) {
                                  buildPicture(cached[1]);
                                  return;
                              }

                              const loader = Gly.Loader.new(Gio.File.new_for_uri(pathToURI(this.image!)));

                              loader.load_async(null, (_, res) => {
                                  let image!: Gly.Image;
                                  try {
                                      image = loader.load_finish(res);
                                  } catch(e) {
                                      console.error(`Notifications: Failed to load notification image (path: "${this.image}")`);
                                      panic();
                                      loader.run_dispose();
                                      return;
                                  }

                                  loader.run_dispose();

                                  image.next_frame_async(null, (_, res) => {
                                      try {
                                          const texture = GlyGtk4.frame_get_texture(image.next_frame_finish(res));
                                          Cache.getDefault().addItem(
                                              "notifications", [this.image!, texture] satisfies NotifImageCache, this.id.toString()
                                          );
                                          // clear cache of this notification when it gets removed from the history
                                          // (there's nothing more to do with this cache, so we just remove it
                                          const connId = Notifications.getDefault().connect("history-removed", (notifs, id) => {
                                              if(id !== this.id)
                                                  return;

                                              notifs.disconnect(connId);
                                              Cache.getDefault().removeItem("notifications", id.toString());
                                          });
                                          buildPicture(texture);
                                      } catch(e) {
                                          console.error(`Notifications: Failed to load frame for notification image (path: "${this.image}")`);
                                          panic();
                                      }

                                      image.run_dispose();
                                  });
                              });
                          };

                          loadImage();
                          createScopedConnection(
                              this, "notify::image", () => {
                                  if(!this.isValidString(this.image) && self.get_visible_child_name() === "picture") {
                                      self.hide();
                                      return;
                                  }

                                  loadImage();
                              }
                          );
                      }}
                      widthRequest={68} heightRequest={64}
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
            <Gtk.ListBox class={"actions"} selectionMode={Gtk.SelectionMode.NONE}>
                <For each={createBinding(this, "actions").as(Notifications.getDefault().removeDuplicateActions)}>
                    {(action: AstalNotifd.Action) => {
                        return <Gtk.Button class={"action"} label={action.label} hexpand
                          onClicked={() => this.emit("action-clicked", action)}
                        />;
                    }}
                </For>
            </Gtk.ListBox> as Gtk.ListBox
        );
    }


    private isValidString(str: string|null): str is string {
        return str !== null && str.trim() !== "";
    }

    connect<S extends keyof Notification.SignalSignatures>(
        signal: S,
        callback: (self: Notification, ...params: Parameters<Notification.SignalSignatures[S]>) => ReturnType<Notification.SignalSignatures[S]>
    ): number {
        return super.connect(signal, callback);
    }
}

export namespace Notification {
    export interface SignalSignatures extends Gtk.Box.SignalSignatures {
        "dismissed": () => void;
        "action-clicked": (action: AstalNotifd.Action) => void;
        "notify::summary": () => void;
        "notify::body": () => void;
        "notify::app-icon": () => void;
        "notify::app-name": () => void;
        "notify::actions": () => void;
        "notify::time": () => void;
        "notify::image": () => void;
    }
    
    export interface ConstructorProps extends Partial<Gtk.Box.ConstructorProps> {
        id: number;
        summary: string;
        body?: string;
        appIcon?: string;
        appName?: string;
        actions?: Array<AstalNotifd.Action>;
        time?: number;
        image?: string;
    }
}
