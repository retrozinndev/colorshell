import { Binding } from "astal";
import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { BackgroundWindow } from "./BackgroundWindow";

type PopupWindowSpecificProps = {
    onDestroy?: (self: Widget.Window) => void;
    onKeyPressEvent?: (self: Widget.Window, event: Gdk.Event) => void;
    onButtonPressEvent?: (self: Gtk.Widget, event: Gdk.Event) => void;
    /** Stylesheet for the background of the popup-window */
    cssBackgroundWindow?: string;
    onClickedOutside?: (self: Widget.Window) => void;
};

export type PopupWindowProps = Pick<Widget.WindowProps, 
    "child"
    | "monitor"
    | "css"
    | "layer"
    | "exclusivity"
    | "marginLeft"
    | "marginTop"
    | "marginRight"
    | "marginBottom"
    | "expand"
    | "cursor"
    | "canFocus"
    | "hasFocus"
    | "tooltipMarkup"
    | "namespace"
    | "widthRequest"
    | "heightRequest"
    | "halign"
    | "valign"
    | "vexpand"
    | "hexpand"> & PopupWindowSpecificProps;

const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export function PopupWindow(props: PopupWindowProps): Widget.Window {
    props.layer = props.layer ?? Astal.Layer.OVERLAY;

    const bgWindow = props.cssBackgroundWindow ? BackgroundWindow({
        monitor: props.monitor ?? 0,
        layer: props.layer,
        css: props.cssBackgroundWindow,
    }) : undefined;

    const winProps: Widget.WindowProps = {};
    for(const key of Object.keys(props).filter(k => k !== "onClickedOutside")) {
        // @ts-ignore ignore the `onClickedOutside()` method because astal thinks it's a signal
        winProps[key as keyof typeof winProps] = props[key as keyof typeof props];
    }

    return new Widget.Window({
        ...winProps,
        namespace: props?.namespace ?? "popup-window",
        className: `popup-window ${(props.namespace instanceof Binding ?
            props.namespace.get() : props.namespace) || ""}`,
        keymode: Astal.Keymode.EXCLUSIVE,
        anchor: TOP | LEFT | RIGHT | BOTTOM,
        exclusivity: props.exclusivity ?? Astal.Exclusivity.NORMAL,
        halign: undefined,
        valign: undefined,
        focusOnMap: true,
        widthRequest: undefined,
        heightRequest: undefined,
        marginTop: undefined,
        marginBottom: undefined,
        marginLeft: undefined,
        marginRight: undefined,
        onDestroy: (self) => {
            bgWindow?.close();
            props.onDestroy?.(self);
        },
        onButtonPressEvent: (self, event) => {
            if((event.get_button()[1] === Gdk.BUTTON_PRIMARY ||
               event.get_button()[1] === Gdk.BUTTON_SECONDARY)) {

                const [ , x, y ] = event.get_coords();
                const allocation = (self.get_child()! as Widget.Box).get_child()!.get_allocation();

                if((x < allocation.x || x > (allocation.x + allocation.width)) ||
                   (y < allocation.y || y > (allocation.y + allocation.height))) {

                    if(!props.onClickedOutside) {
                        self.close();
                        return;
                    }

                    props.onClickedOutside?.(self);
                }
            }
        },
        onKeyPressEvent: (self, event: Gdk.Event) => {
            if(event.get_keyval()[1] === Gdk.KEY_Escape) {
                self.close();
                return;
            }

            props.onKeyPressEvent?.(self, event);
        },
        child: new Widget.Box({
            expand: props.expand ?? false,
            halign: props.halign,
            valign: props.valign,
            hexpand: true,
            css: `box {
                margin-left: ${props.marginLeft ?? 0}px;
                margin-right: ${props.marginRight ?? 0}px;
                margin-top: ${props.marginTop ?? 0}px;
                margin-bottom: ${props.marginBottom ?? 0}px;
            }`,
            
            child: new Widget.Box({
                onButtonPressEvent: props.onButtonPressEvent ?? (() => true),
                widthRequest: props.widthRequest,
                heightRequest: props.heightRequest,
                child: props.child
            } as Widget.BoxProps)
        } as Widget.BoxProps)
    } as Widget.WindowProps);
}
