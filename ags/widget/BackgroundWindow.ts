import { Astal, Gdk, Widget } from "astal/gtk3";

const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

/** Creates a fullscreen GtkWindow that is used for making
 * the user focus on the content after this window(e.g.: AskPopup,
 * Authentication Window...)
 *
 * @param css Custom stylesheet used in the window. defaults to setting `background-color` to rgba(0, 0, 0, .2)
 * @param onClick Function that is called when the user clicks on the window
 * @returns the generated background window
 */
export function BackgroundWindow(css?: (string | null), onClickPrimary?: (((window: Widget.Window) => void) | null),
                                onClickSecondary?: (((window: Widget.Window) => void) | null)): Widget.Window {
    return new Widget.Window({
        namespace: "background-window",
        css: css ?? "background: rgba(0, 0, 0, .2);",
        anchor: TOP | LEFT | BOTTOM | RIGHT,
        exclusivity: Astal.Exclusivity.IGNORE,
        onButtonPressEvent: (window, event: Gdk.Event) => {
            if(event.get_button()[1] === Gdk.BUTTON_PRIMARY) {
                onClickPrimary?.(window);
                return;
            }

            if(event.get_button()[1] === Gdk.BUTTON_SECONDARY) 
                onClickSecondary?.(window);
        }
    } as Widget.WindowProps);
}
