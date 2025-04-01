import { Binding, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { tr } from "../../../i18n/intl";

export type TileProps = {
    className?: string | Binding<string | undefined>;
    icon?: string | Binding<string | undefined>;
    visible?: boolean | Binding<boolean | undefined>;
    iconSize?: number | Binding<number | undefined>;
    title: string | Binding<string | undefined>;
    description?: string | Binding<string | undefined>;
    toggleState?: boolean | Binding<boolean | undefined>;
    onToggledOn: () => void;
    onToggledOff: () => void;
    onClickMore?: () => void;
}

export function Tile(props: TileProps): (() => Widget.EventBox) {
    const toggled = new Variable<boolean>(props.toggleState instanceof Binding ?
        (props.toggleState.get() || false) : (props.toggleState || false));

    let subscription: () => void;

    if(props?.toggleState instanceof Binding) 
        subscription = props.toggleState.subscribe(val => toggled.set(val || false));

    return () => new Widget.EventBox({
        className: toggled().as((state: boolean) => 
            state ? "tile-eventbox toggled" : "tile-eventbox"),
        expand: true,
        onClick: () => {
            if(toggled.get()) {
                toggled.set(false);
                console.log(toggled.get());
                props.onToggledOff && props.onToggledOff();
                return;
            }

            toggled.set(true);
            props.onToggledOn && props.onToggledOn(); 
        },
        onDestroy: () => subscription?.(),
        child: new Widget.Box({
            className: (props.className instanceof Binding) ? 
                props.className.as((clsName: (string|undefined)) => 
                    `tile ${clsName || ""}`)
                : `tile ${props.className || ""}`,
            visible: props.visible,
            expand: true,
            hexpand: true,
            children: [
                new Widget.Box({
                    className: "content",
                    expand: true,
                    children: [
                        new Widget.Label({
                            className: "icon nf",
                            label: props.icon || "icon",
                            css: `label { font-size: ${props.iconSize || 12}px; }`
                        } as Widget.LabelProps),
                        new Widget.Box({
                            className: "text",
                            orientation: Gtk.Orientation.VERTICAL,
                            vexpand: true,
                            hexpand: true,
                            valign: Gtk.Align.CENTER,
                            children: [
                                new Widget.Label({
                                    className: "title",
                                    xalign: 0,
                                    halign: Gtk.Align.START,
                                    truncate: true,
                                    label: props.title
                                } as Widget.LabelProps),
                                new Widget.Label({
                                    className: "description",
                                    visible: (props.description instanceof Binding) ?
                                        props.description.as(Boolean)
                                    : Boolean(props.description),
                                    halign: Gtk.Align.START,
                                    truncate: true,
                                    xalign: 0,
                                    label: (props.description instanceof Binding) ?
                                        props.description.as((desc) => desc ? desc : "")
                                    : (props.description || "")
                                } as Widget.LabelProps)
                            ]
                        } as Widget.BoxProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Button({
                    className: "more icon",
                    visible: props.onClickMore !== undefined,
                    halign: Gtk.Align.END,
                    tooltipText: tr("control_center.tiles.more") || "More",
                    image: new Widget.Icon({
                        icon: "go-next-symbolic",
                        css: "icon { font-size: 16px; }"
                    }),
                    onClick: () => props.onClickMore && props?.onClickMore(),
                    widthRequest: 32
                })
            ]
        })
    } as Widget.EventBoxProps)
}
