import { Astal, Gtk, Widget } from "astal/gtk3";


const { TOP, BOTTOM, LEFT, RIGHT }: typeof Astal.WindowAnchor = Astal.WindowAnchor;

/**
 * Creates a screen-size window and opens the provided window after it. 
 * When clicking in the transparent background window, it closes(hides) 
 * the provided window.
 * @param window the window to be rendered and closed when clicking outside of it
 */
export function PopupWindow(window: Gtk.Window) {
    const bgWindow: Gtk.Window = new Widget.Window({
        namespace: "popup-bg-window",
        anchor: TOP | BOTTOM | LEFT | RIGHT,

    } as Widget.WindowProps);
}
