import { Binding } from "astal";
import { Astal, Gdk, Widget } from "astal/gtk3";
import { BackgroundWindow } from "./BackgroundWindow";
import { Windows } from "../windows";

type PopupWindowSpecificProps = {
    onDestroy?: (self: Widget.Window) => void;
    onKeyPressEvent?: (win: Widget.Window, event: Gdk.Event) => void;
    /** Do something else instead of closing window on close action(clicking outside conent/pressing Escape) 
     * Observation: onClose() will still be called after close action, if defined.
     */
    closeAction?: (self: Widget.Window) => void;
    /** Do something when window closes */
    onClose?: (self: Widget.Window) => void;
    /** Stylesheet for the background of the popup-window */
    cssBackgroundWindow?: string;
};

export type PopupWindowProps = Omit<Widget.WindowProps, "keymode"> & PopupWindowSpecificProps;

export function PopupWindow(props: PopupWindowProps): Widget.Window {
    props.closeAction = props.closeAction ?? ((window) => window.close());

    const bgWindow = BackgroundWindow({
        monitor: Windows.getFocusedMonitorId() ?? 0,
        css: props.cssBackgroundWindow ?? "", 
        onClick: () => {
            props.closeAction!(window);
            props.onClose?.(window);
        }
    });

    const window = new Widget.Window({
        ...props,
        namespace: props?.namespace ?? "popup-window",
        className: `popup-window ${(props.namespace instanceof Binding ?
            props.namespace.get() : props.namespace) || ""}`,
        keymode: Astal.Keymode.EXCLUSIVE,
        onDestroy: (self) => {
            bgWindow.close();
            props.closeAction!(self);
            props.onClose?.(self);
            props.onDestroy?.(self);
        },
        onKeyPressEvent: (self, event: Gdk.Event) => {
            if(event.get_keyval()[1] === Gdk.KEY_Escape) {
                props.closeAction!(self);
                bgWindow.close();

                return;
            }

            props.onKeyPressEvent?.(self, event);
        },
    } as Widget.WindowProps);

    return window;
}
