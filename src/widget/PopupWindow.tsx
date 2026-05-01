import { Astal, Gdk, Gtk } from "ags/gtk4";
import { BackgroundWindow } from "./BackgroundWindow";
import { createBinding } from "ags";
import { omitObjectKeys } from "../modules/utils";
import GObject, { gtype, property, register, signal } from "ags/gobject";


@register({ GTypeName: "ClshPopupWindow" })
export class PopupWindow extends Astal.Window {
    declare $signals: PopupWindow.SignalSignatures;

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


    constructor(props: Partial<PopupWindow.ConstructorProps>) {
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
        });

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
        this.#bg.hide();

        const gestureClick = Gtk.GestureClick.new();
        const keyController = Gtk.EventControllerKey.new();
        
        this.#conns.set(gestureClick, gestureClick.connect("released", (_, __, gx, gy) => {
            const child = this.get_child();
            if(!child) {
                this.emit("clicked-outside");
                return;
            }

            const { x, y, width, height } = child.get_allocation();

            if((gx < x || gx > (x + width)) || (gy > (y + height) || gy < y))
                this.emit("clicked-outside");
        }));

        this.#conns.set(keyController, keyController.connect("key-pressed", (_, keyval, keycode) => {
            if(keyval === Gdk.KEY_Escape) {
                this.emit("clicked-outside");
                return true;
            }

            this.emit("key-pressed", keyval, keycode);
            return !this.propagateKeyEvent;
        }));

        this.#conns.set(this, this.connect("close-request", () => {
            this.#conns.forEach((id, obj) => obj.disconnect(id));
        }));

        this.add_controller(gestureClick);
        this.add_controller(keyController);
    }

    hide(): void {
        this.#bg.hide();
        super.hide();
    }

    show(): void {
        if(this.#bg.is_visible())
            this.#bg.hide();

        this.#bg.show();
        super.show();
    }

    close(): void {
        super.close();
        this.emit("closed");
    }
}

export namespace PopupWindow {
    export interface ConstructorProps extends Omit<
        Astal.Window.ConstructorProps, 
        | "child"
        | "anchor"
        | "margin_top"
        | "margin_bottom"
        | "margin_left"
        | "margin_right"
    > {
        backgroundCss: string;
        propagateKeyEvent: boolean;
        closeOnClickOutside: boolean;
    };

    export interface SignalSignatures extends Astal.Window.SignalSignatures {
        "closed": () => void;
        "clicked-outside": () => void;
        "key-pressed": (keyval: number, keycode: number) => void;
    }
}
