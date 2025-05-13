import { Binding } from "astal";
import { Astal, Gtk, Widget } from "astal/gtk3";
import { Windows } from "../windows";
import { PopupWindow, PopupWindowProps } from "./PopupWindow";
import { Separator } from "./Separator";
import { tr } from "../i18n/intl";

export type CustomDialogProps = {
    namespace?: string | Binding<string>;
    className?: string | Binding<string>;
    cssBackground?: string;
    title?: string | Binding<string>;
    text?: string | Binding<string>;
    heightRequest?: number | Binding<number>;
    widthRequest?: number | Binding<number>;
    childOrientation?: Gtk.Orientation | Binding<Gtk.Orientation>;
    children?: Array<Gtk.Widget> | Binding<Array<Gtk.Widget>>;
    child?: Gtk.Widget | Binding<Gtk.Widget>;
    onFinish?: () => void;
    options?: Array<CustomDialogOption>;
    optionsOrientation?: Gtk.Orientation | Binding<Gtk.Orientation>;
};

export interface CustomDialogOption {
    onClick?: () => void;
    text: string | Binding<string>;
    closeOnClick?: boolean | Binding<boolean>;
}

export function CustomDialog(props: CustomDialogProps = {
    options: [{ text: tr("accept") }]
}): Widget.Window {
    const window = Windows.createWindowForFocusedMonitor((mon: number) => PopupWindow({
        namespace: props.namespace ?? "custom-dialog",
        monitor: mon,
        cssBackgroundWindow: props.cssBackground ?? "background: rgba(0, 0, 0, .3);",
        exclusivity: Astal.Exclusivity.IGNORE,
        layer: Astal.Layer.OVERLAY,
        widthRequest: props.widthRequest ?? 400,
        heightRequest: props.heightRequest ?? 220,
        onDestroy: props.onFinish,
        child: new Widget.Box({
            className: props.className ?? "custom-dialog-container",
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.Label({
                    className: "title",
                    visible: props.title,
                    label: props.title
                } as Widget.LabelProps),
                new Widget.Label({
                    className: "text",
                    visible: props.text,
                    label: props.text,
                    yalign: 0,
                    expand: true
                } as Widget.LabelProps),
                new Widget.Box({
                    className: "custom-children custom-child",
                    visible: props.children || props.child,
                    orientation: props.childOrientation ?? Gtk.Orientation.VERTICAL,
                    children: props.children,
                    child: props.child
                } as Widget.BoxProps),
                Separator({
                    alpha: .2,
                    visible: props.options && props.options.length > 0,
                    spacing: 8,
                    orientation: Gtk.Orientation.VERTICAL
                }),
                new Widget.Box({
                    className: "options",
                    orientation: props.optionsOrientation ?? Gtk.Orientation.HORIZONTAL,
                    hexpand: true,
                    heightRequest: 38,
                    homogeneous: true,
                    children: props.options && props.options.map(option => {
                        const onClick = () => {
                            option.onClick?.();
                            (option.closeOnClick ?? true) && 
                                window.close();
                        };
                        const connections: Array<number> = [];
                        const btn = new Widget.Button({
                            className: "option",
                            label: option.text,
                            hexpand: true,
                            setup: (self) => {
                                connections.push(
                                    self.connect("click-release", (_, event: Astal.ClickEvent) =>
                                        event.button === Astal.MouseButton.PRIMARY && 
                                            onClick()),
                                    self.connect("activate", (_) => onClick())
                                );
                            },
                            onDestroy: (self) => connections.map(id => self.disconnect(id))
                        } as Widget.ButtonProps);

                        return btn;
                    })
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    } as PopupWindowProps))();

    return window;
}
