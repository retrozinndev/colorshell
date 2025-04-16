import { Binding } from "astal";
import { PopupWindow, PopupWindowProps } from "./PopupWindow";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { Separator } from "./Separator";
import { tr } from "../i18n/intl";
import { Windows } from "../windows";


export type AskPopupProps = {
    title?: string | Binding<string | undefined>;
    text: string | Binding<string | undefined>;
    cancelText?: string;
    acceptText?: string;
    onAccept: () => void;
    onCancel?: () => void;
};

/** 
 * A Popup Widget that asks yes or no to a defined promt. 
 * Runs onAccept() when user accepts, or else onDecline() when
 * user doesn't accept / closes window.
 * This window isn't usually registered in this shell windowing 
 * system.
 */
export function AskPopup(props: AskPopupProps): Widget.Window {
    const buttons = [
        new Widget.Button({
            className: "cancel",
            hexpand: true,
            label: props.cancelText || tr("ask_popup.options.cancel") || "Cancel",
            onClick: () => window.close(),
        } as Widget.ButtonProps),
        new Widget.Button({
            className: "accept",
            hexpand: true,
            label: props.acceptText || tr("ask_popup.options.accept") || "Ok",
            onClick: () => {
                window.close();
                props.onAccept?.();
            }
        } as Widget.ButtonProps)
    ];

    const window = Windows.createWindowForFocusedMonitor((mon: number) => PopupWindow({
        namespace: "ask-popup",
        className: "ask-popup",
        monitor: mon,
        cssBackgroundWindow: "background: rgba(0, 0, 0, .3);",
        exclusivity: Astal.Exclusivity.IGNORE,
        layer: Astal.Layer.OVERLAY,
        widthRequest: 400,
        heightRequest: 220,
        onDestroy: () => props.onCancel?.(),
        child: new Widget.Box({
            className: "ask-popup-box",
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.Label({
                    className: "title",
                    visible: Boolean(props.title),
                    label: props.title || tr("ask_popup.title") || "Question"
                } as Widget.LabelProps),
                Separator({
                    alpha: .2,
                    orientation: Gtk.Orientation.VERTICAL
                }),
                new Widget.Label({
                    className: "text",
                    label: props.text,
                    yalign: 0,
                    expand: true
                } as Widget.LabelProps),
                new Widget.Box({
                    className: "buttons",
                    orientation: Gtk.Orientation.HORIZONTAL,
                    hexpand: true,
                    heightRequest: 38,
                    homogeneous: true,
                    children: buttons
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    } as PopupWindowProps))();

    return window;
}
