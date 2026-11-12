import { This } from "ags";
import { getter, gtype, register, signal } from "ags/gobject";
import { Astal, Gtk } from "ags/gtk4";
import GObject from "gi://GObject?version=2.0";


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

/** Creates a fullscreen layer that is can be styled to make
 * the user focus on the content after this widget(e.g.: CustomDialog,
 * App Drawer or any other PopupWindow).
 *
 * In order to use this widget, you may want to `attach` this to the
 * main layer, so you can use the background layer(this widget) to
 * control the main one accordingly(only set_visible requests tbh).
 *
 * You can also attach a layer by adding the layer with the `"attached"`
 * builder type.
 * */
@register({
    GTypeName: "ClshBackgroundWindow",
    Implements: [Gtk.Buildable]
})
class BackgroundWindow extends Astal.Window {
    declare $signals: BackgroundWindow.SignalSignatures;
    #attachedLayer: [Astal.Window, number]|null = null;

    @signal(Number)
    keyPressed(keyval: number) {}

    @signal(Number)
    clicked(button: number) {}

    @getter(gtype<Astal.Window|null>(Astal.Window))
    get attachedLayer() { return this.#attachedLayer?.[0] ?? null; }


    constructor({attach, ...props}: Partial<BackgroundWindow.ConstructorProps> = {}) {
        super({
            namespace: "background-window",
            layer: Astal.Layer.OVERLAY,
            keymode: Astal.Keymode.EXCLUSIVE,
            exclusivity: Astal.Exclusivity.IGNORE,
            anchor: TOP | LEFT | BOTTOM | RIGHT,
            ...props
        });

        if(attach != null)
            this.attach(attach);

        void (
            <This this={this as BackgroundWindow}>
                <Gtk.GestureClick button={0}
                  onReleased={(gesture) => {
                      (this as BackgroundWindow).emit("clicked", gesture.get_current_button());
                  }}
                />
                <Gtk.EventControllerKey
                  onKeyReleased={(_, kv) => {
                      (this as BackgroundWindow).emit("key-pressed", kv);
                  }}
                />
            </This>
        );
    }

    vfunc_add_child(builder: Gtk.Builder, child: Gtk.Widget, type: string|null): void {
        if(type === "attached" && child instanceof Astal.Window) {
            this.attach(child);
            return;
        }

        super.vfunc_add_child(builder, child, type);
    }

    vfunc_notify(pspec: GObject.ParamSpec): void {
        switch(pspec.name) {
            case "visible": {
                if(this.attachedLayer && this.attachedLayer.visible)
                    this.attachedLayer.visible = false;

                if(this.visible) {
                    setTimeout(() => { // just in case (gtk can freeze when doing this too fast)
                        if(this.attachedLayer)
                            this.attachedLayer.visible = true;
                    }, 50);
                }
                break;
            }
        }
    }

    /** attach a main window to this background layer */
    attach(layer: Astal.Window): void {
        this.#attachedLayer = [layer, layer.connect("close-request", () => {
            this.deattach();
            this.close();
        })];
        this.gdkmonitor = layer.gdkmonitor;
        this.notify("attached-layer");
    }

    /** deattach a window from this background layer(if any) */
    deattach(): void {
        if(this.#attachedLayer == null)
            return;

        const [layer, conn] = this.#attachedLayer;
        this.#attachedLayer = null;
        this.notify("attached-layer");

        GObject.signal_handler_is_connected(layer, conn) &&
            layer.disconnect(conn);
    }
}

namespace BackgroundWindow {
    export interface ConstructorProps extends Astal.Window.ConstructorProps {
        attach: Astal.Window;
    }

    export interface SignalSignatures extends Astal.Window.SignalSignatures {
        "key-pressed"(keyval: number): void;
        "clicked"(button: number): void;

        "notify::attached-layer"(): void;
    }
}

export default BackgroundWindow;
