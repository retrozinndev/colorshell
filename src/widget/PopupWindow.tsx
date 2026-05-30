import { Astal, Gdk, Gtk } from "ags/gtk4";
import { BackgroundWindow } from "./BackgroundWindow";
import { createBinding } from "ags";
import { omitObjectKeys } from "../modules/utils";
import GObject, { gtype, property, register, signal } from "ags/gobject";


@register({ GTypeName: "ClshPopupWindow" })
export class PopupWindow extends Astal.Window {
    declare $signals: PopupWindow.SignalSignatures;
    declare $readWriteProperties: PopupWindow.ReadWriteProperties;

    #conns: Map<GObject.Object, number> = new Map();
    #bg: Astal.Window;

    @signal()
    closed() {}

    @signal()
    clickedOutside() {
        if(!this.closeOnClickOutside)
            return;

        this.close();
    }

    @signal(Number, Number)
    keyPressed(_: number, __: number) {}

    @property(Boolean)
    closeOnClickOutside: boolean = true;

    @property(gtype<string|null>(String))
    backgroundCss: string|null = null;

    /** whether to continue propagating the event to children after handling in ::key-pressed.
      * @default false */
    @property(Boolean)
    propagateKeyEvent: boolean = false;


    constructor(props: Partial<GObject.ConstructorProps<PopupWindow>>) {
        super({
            namespace: "clsh-popup-window",
            cssName: "popupwindow",
            layer: Astal.Layer.OVERLAY,
            keymode: Astal.Keymode.EXCLUSIVE,
            exclusivity: Astal.Exclusivity.NORMAL,
            ...omitObjectKeys(props, [
                "propagateKeyEvent",
                "backgroundCss",
                "closeOnClickOutside"
            ]),
            anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM 
                | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT,
        } as never); // tmp fix

        if(props.propagateKeyEvent !== undefined)
            this.propagateKeyEvent = props.propagateKeyEvent;

        if(props.backgroundCss !== undefined)
            this.backgroundCss = props.backgroundCss;

        if(props.closeOnClickOutside !== undefined)
            this.closeOnClickOutside = props.closeOnClickOutside;

        this.#bg = BackgroundWindow({
            css: createBinding(this, "backgroundCss")(css => css ?? ""),
            monitor: createBinding(this, "monitor"),
            layer: createBinding(this, "layer"),
            keymode: Astal.Keymode.NONE,
            attach: this,
            exclusivity: Astal.Exclusivity.IGNORE
        });
        this.#bg.set_visible(false);

        const gestureClick = Gtk.GestureClick.new();
        const keyController = Gtk.EventControllerKey.new();
        
        this.#conns.set(gestureClick, gestureClick.connect("released", (_, __, gx, gy) => {
            const child = this.get_child();
            if(!child) {
                (this as PopupWindow).emit("clicked-outside");
                return;
            }

            const alloc = child.compute_bounds(this)[1];

            if((gx < alloc.get_x() || gx > (alloc.get_x() + alloc.get_width())) || 
               (gy > (alloc.get_y() + alloc.get_height()) || gy < alloc.get_y())) {

                (this as PopupWindow).emit("clicked-outside");
            }
        }));

        this.#conns.set(keyController, keyController.connect("key-pressed", (_, keyval, keycode) => {
            if(keyval === Gdk.KEY_Escape) {
                (this as PopupWindow).emit("clicked-outside");
                return true;
            }

            (this as PopupWindow).emit("key-pressed", keyval, keycode);
            return !this.propagateKeyEvent;
        }));

        this.#conns.set(this, (this as PopupWindow).connect("close-request", () => {
            this.#conns.forEach((id, obj) => obj.disconnect(id));

            return false;
        }));

        this.add_controller(gestureClick);
        this.add_controller(keyController);
    }
}

export namespace PopupWindow {
    export interface ReadWriteProperties extends Astal.Window.ReadWriteProperties {
        "background-css": string|null;
        "close-on-click-outside": boolean;
        "propagate-key-event": boolean;
    }

    export interface SignalSignatures extends Astal.Window.SignalSignatures {
        "closed"(): void;
        "clicked-outside"(): void;
        "key-pressed"(keyval: number, keycode: number): void;
    }
}
