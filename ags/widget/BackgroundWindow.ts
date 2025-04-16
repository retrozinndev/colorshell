import { Binding } from "astal";
import { Astal, Gdk, Widget } from "astal/gtk3";


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export type BackgroundWindowProps = {
    /** GtkWindow Layer */
    layer?: Astal.Layer | Binding<Astal.Layer | undefined>;
    /** Monitor number where the window should open */
    monitor: number | Binding<number | undefined>;
    /** Custom stylesheet used in the window. default: `background: rgba(0, 0, 0, .2)` */
    css?: string | Binding<string | undefined>;
    /** Function that is called when the user clicks on the window (any mouse button) */
    onClick?: (window: Widget.Window) => void;
    /** Function that is called when the user clicks on the window with primary mouse button */
    onClickPrimary?: (window: Widget.Window) => void;
    /** Function that is called when the user clicks on the window with secodary mouse button */
    onClickSecondary?: (window: Widget.Window) => void;
};

/** Creates a fullscreen GtkWindow that is used for making
 * the user focus on the content after this window(e.g.: AskPopup,
 * Authentication Window(futurely) or any PopupWindow)
 *
 * @param props Properties for background-window
 *
 * @returns The generated background window
 */
export function BackgroundWindow(props: BackgroundWindowProps) {
    return new Widget.Window({
        namespace: "background-window",
        css: props.css ?? "background: rgba(0, 0, 0, .2);",
        monitor: props.monitor,
        layer: props.layer ?? Astal.Layer.OVERLAY,
        anchor: TOP | LEFT | BOTTOM | RIGHT,
        exclusivity: Astal.Exclusivity.IGNORE,
        onButtonPressEvent: (window, event: Gdk.Event) => {
            if(event.get_button()[1]) {
                props.onClick?.(window);
                return;
            }

            if(event.get_button()[1] === Gdk.BUTTON_PRIMARY) {
                props.onClickPrimary?.(window);
                return;
            }

            if(event.get_button()[1] === Gdk.BUTTON_SECONDARY) 
                props.onClickSecondary?.(window);
        }
    } as Widget.WindowProps);
}
