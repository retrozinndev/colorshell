import { Binding } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { tr } from "../i18n/intl";
import { Windows } from "../windows";
import { PopupWindow, PopupWindowProps } from "./PopupWindow";
import { Separator } from "./Separator";

export type EntryPopupProps = {
    title?: string | Binding<string | undefined>;
    text: string | Binding<string | undefined>;
    cancelText?: string | Binding<string | undefined>;
    acceptText?: string | Binding<string | undefined>;
    closeOnAccept?: boolean;
    entryPlaceholder?: string | Binding<string | undefined>;
    onAccept: (userInput: string) => void;
    onCancel?: () => void;
    onFinish?: () => void;
    isPassword?: boolean | Binding<string | undefined>;
};

export function EntryPopup(props: EntryPopupProps): Widget.Window {
    props.closeOnAccept = props.closeOnAccept ?? true;

    const entry = new Widget.Entry({
        className: props.isPassword && "password",
        visibility: (props.isPassword instanceof Binding) ? 
            props.isPassword.as(isPasswd => !isPasswd) 
        : !props.isPassword,
        invisibleChar: 0x00B7, // set '·' as the invisible char
        xalign: .5,
        placeholderText: props.entryPlaceholder,
        onActivate: (self) => {
            props.closeOnAccept && window.close();
            entered = true;
            props.onAccept(self.text);
            self.text = "";
        },
    } as Widget.EntryProps);

    let entered: boolean = false;
    const buttons = [
        new Widget.Button({
            className: "cancel",
            hexpand: true,
            label: props.cancelText ?? tr("cancel"),
            onClick: () => props.closeOnAccept && window.close(),
        } as Widget.ButtonProps),
        new Widget.Button({
            className: "accept",
            hexpand: true,
            label: props.acceptText ?? tr("accept"),
            onClick: () => {
                props.closeOnAccept && window.close();
                entered = true;
                props.onAccept(entry.text);
                entry.text = "";
            }
        } as Widget.ButtonProps)
    ];

    const window = Windows.createWindowForFocusedMonitor((mon: number) => PopupWindow({
        namespace: "entry-popup",
        className: "entry-popup",
        monitor: mon,
        cssBackgroundWindow: "background: rgba(0, 0, 0, .3);",
        exclusivity: Astal.Exclusivity.IGNORE,
        layer: Astal.Layer.OVERLAY,
        widthRequest: 400,
        heightRequest: 220,
        onDestroy: () => {
            props.onFinish?.();
            !entered && props.onCancel?.()
        },
        child: new Widget.Box({
            className: "entry-popup-box",
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
                entry,
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
