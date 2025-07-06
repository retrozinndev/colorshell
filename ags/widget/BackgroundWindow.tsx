import { Accessor } from "ags";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import GObject from "gi://GObject?version=2.0";


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export type BackgroundWindowProps = {
    /** GtkWindow Layer */
    layer?: Astal.Layer | Accessor<Astal.Layer>;
    /** Monitor number where the window should open */
    monitor: number | Accessor<number>;
    /** Custom stylesheet used in the window. default: `background: rgba(0, 0, 0, .2)` */
    css?: string | Accessor<string>;
    /* Function that is called when the user releases a key in the keyboard on the window 
    * The `Escape` key is not passed to this function */
    actionKeyPressed?: (window: Astal.Window, keyval: number, keycode: number) => void;
    /** Function that is called when the user triggers a mouse-click or escape action on the window */
    actionFired?: (window: Astal.Window) => void;
    /** Function that is called when the user clicks on the window with primary mouse button */
    actionClickPrimary?: (window: Astal.Window) => void;
    /** Function that is called when the user clicks on the window with secodary mouse button */
    actionClickSecondary?: (window: Astal.Window) => void;
    keymode?: Astal.Keymode;
    exclusivity?: Astal.Exclusivity;
};

/** Creates a fullscreen GtkWindow that is used for making
 * the user focus on the content after this window(e.g.: AskPopup,
 * Authentication Window(futurely) or any PopupWindow)
 *
 * @param props Properties for background-window
 *
 * @returns The generated background window
 */
export function BackgroundWindow(props: BackgroundWindowProps): Astal.Window {
    const conns: Map<GObject.Object, number> = new Map();

    return <Astal.Window namespace={"background-window"}
        css={props.css ?? "background: rgba(0, 0, 0, .2);"}
        monitor={props.monitor}
        layer={props.layer ?? Astal.Layer.OVERLAY}
        anchor={TOP | LEFT | BOTTOM | RIGHT}
        keymode={props.keymode}
        exclusivity={props.exclusivity ?? Astal.Exclusivity.IGNORE}
        onDestroy={(_) => conns.forEach((id, obj) => obj.disconnect(id))}
        $={(self) => {
            const gestureClick = Gtk.GestureClick.new(),
                eventControllerKey = Gtk.EventControllerKey.new();

            self.add_controller(gestureClick);
            self.add_controller(eventControllerKey);

            conns.set(eventControllerKey, eventControllerKey.connect("key-released", 
                (_, keyval, keycode) => {
                    if(keyval === Gdk.KEY_Escape) {
                        props.actionFired?.(self);
                        return;
                    }

                    props.actionKeyPressed?.(self, keyval, keycode);
                }
            ));

            conns.set(gestureClick, gestureClick.connect("released", (gesture) => {
                if(gesture.get_current_button() === Gdk.BUTTON_PRIMARY) {
                    props.actionClickPrimary?.(self);
                    return;
                }

                if(gesture.get_current_button() === Gdk.BUTTON_SECONDARY) {
                    props.actionClickSecondary?.(self);
                    return;
                }

                props.actionFired?.(self);
            }));
        }} 
    /> as Astal.Window;
}
