import { Binding } from "astal";
import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";


const { TOP, BOTTOM, LEFT, RIGHT }: typeof Astal.WindowAnchor = Astal.WindowAnchor;

export type PopupWindowProps = Pick<Widget.WindowProps, 
    "namespace"
    | "visible"
    | "className"
    | "hexpand"
    | "vexpand"
    | "halign"
    | "valign"
    | "expand"
    | "layer"
    | "widthRequest"
    | "heightRequest"
    | "child"
    | "monitor"
    | "setup"
    | "exclusivity"> & {
    marginTop?: number;
    marginLeft?: number;
    marginBottom?: number;
    marginRight?: number;
    onKeyPressEvent?: (self: Widget.Window, event: Gdk.Event) => void;
    /** Do something else instead of hiding window on close action(clicking outside conent / pressing Escape) 
     * Observation: onClose() function will still be ran after close action if defined.
     */
    closeAction?: (self: Widget.Window) => void;
    onClose?: (self: Widget.Window) => void;
};

export function PopupWindow(props: PopupWindowProps): Widget.Window {
    return new Widget.Window({
        namespace: props?.namespace || "popup-window",
        className: `popup-window ${(props.namespace instanceof Binding ?
            props.namespace.get() : props.namespace) || ""}`,
        anchor: TOP | BOTTOM | LEFT | RIGHT,
        exclusivity: props.exclusivity || Astal.Exclusivity.NORMAL,
        keymode: Astal.Keymode.EXCLUSIVE,
        layer: props?.layer || Astal.Layer.OVERLAY,
        focusOnMap: true,
        visible: props?.visible,
        monitor: props?.monitor || 0,
        setup: props.setup,
        onButtonPressEvent: (_, event: Gdk.Event) => {
            const [, posX, posY] = event.get_coords();
            const childAllocation = _.get_child()!.get_allocation();

            if((posX < childAllocation.x || posX > (childAllocation.x + childAllocation.width)) || 
               (posY < childAllocation.y || posY > (childAllocation.y + childAllocation.height))) {
                _.hide();
                props?.onClose && props.onClose(_);
            }
        },
        onKeyPressEvent: (_, event: Gdk.Event) => {
            if(event.get_keyval()[1] === Gdk.KEY_Escape) {
                !props.closeAction ? _.hide() : props.closeAction(_);
                props.onClose && props.onClose(_);
            }

            props.onKeyPressEvent && 
                props.onKeyPressEvent(_, event);
        },
        child: new Widget.Box({
            className: (props?.className instanceof Binding) ? 
                props.className.as((clsName: string|undefined) => 
                    `popup ${clsName || ""}`)
            : `popup ${props?.className || ""}`,
            halign: props?.halign || Gtk.Align.CENTER,
            valign: props?.valign || Gtk.Align.CENTER,
            css: `.popup {
                margin-top: ${props.marginTop || 0}px;
                margin-bottom: ${props.marginBottom || 0}px;
                margin-left: ${props.marginLeft || 0}px;
                margin-right: ${props.marginRight || 0}px;
            }`,
            expand: props.expand,
            vexpand: props.vexpand,
            hexpand: props.hexpand,
            widthRequest: props.widthRequest,
            heightRequest: props.heightRequest,
            onButtonPressEvent: () => true,
            child: props.child
        } as Widget.BoxProps)
    } as Widget.WindowProps);
}
