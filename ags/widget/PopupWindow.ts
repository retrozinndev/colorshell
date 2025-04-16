import { Binding } from "astal";
import { Astal, Gdk, Widget } from "astal/gtk3";
import { BackgroundWindow } from "./BackgroundWindow";

type PopupWindowSpecificProps = {
    onDestroy?: (self: Widget.Window) => void;
    onKeyPressEvent?: (win: Widget.Window, event: Gdk.Event) => void;
    /** Stylesheet for the background of the popup-window */
    cssBackgroundWindow?: string;
};

export type PopupWindowProps = Omit<Widget.WindowProps, "keymode"> & PopupWindowSpecificProps;

export function PopupWindow(props: PopupWindowProps): Widget.Window {
    props.layer = props.layer ?? Astal.Layer.OVERLAY;

    const bgWindow = BackgroundWindow({
        monitor: props.monitor ?? 0,
        layer: props.layer!,
        css: props.cssBackgroundWindow ?? "", 
        onClick: (bgWin) => {
            bgWin.close();
            window.close();
        }
    });

    const window = new Widget.Window({
        ...props,
        namespace: props?.namespace ?? "popup-window",
        className: `popup-window ${(props.namespace instanceof Binding ?
            props.namespace.get() : props.namespace) || ""}`,
        keymode: Astal.Keymode.EXCLUSIVE,
        layer: props.layer!,
        onDestroy: (self) => {
            bgWindow.close();
            props.onDestroy?.(self);
        },
        onKeyPressEvent: (self, event: Gdk.Event) => {
            if(event.get_keyval()[1] === Gdk.KEY_Escape) {
                bgWindow.close();
                self.close();

                return;
            }

            props.onKeyPressEvent?.(self, event);
        },
    } as Widget.WindowProps);

    return window;
}
