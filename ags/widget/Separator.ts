import { Binding } from "astal";
import { Gtk, Widget } from "astal/gtk3";

export interface SeparatorProps {
    class?: string;
    alpha?: number;
    cssColor?: string;
    orientation?: Gtk.Orientation;
    size?: number;
    spacing?: number;
    margin?: number;
    visible?: boolean | Binding<boolean>;
}

export function Separator(props: SeparatorProps = {
    orientation: Gtk.Orientation.HORIZONTAL
}) {
    props.alpha = props.alpha ? 
        (props.alpha > 1 ? 
            props.alpha / 100
        : props.alpha)
    : 1;

    props.orientation = props.orientation ?? Gtk.Orientation.HORIZONTAL;

    return new Widget.Box({
        name: "separator",
        ...(props.orientation === Gtk.Orientation.HORIZONTAL ? 
            { vexpand: true } : { hexpand: true }),
        className: `separator ${ props.orientation === Gtk.Orientation.VERTICAL ? 
                "vertical" : "horizontal" }`,
        visible: props.visible,
        css: `.vertical {
            padding: ${props.spacing ?? 0}px ${props.margin ?? 7}px;
        }
        .horizontal {
            padding: ${props.margin ?? 4}px ${props.spacing ?? 0}px;
        }`,
        child: new Widget.Box({
            className: `${ props.orientation === Gtk.Orientation.VERTICAL ? 
                "vertical" : "horizontal" } ${ props.class ? props.class : "" }`,
            ...(props.orientation === Gtk.Orientation.HORIZONTAL ? 
                { vexpand: true } : { hexpand: true }),
            css: `* {
                background: ${ props.cssColor ?? "lightgray" };
                opacity: ${props.alpha};
            }
            .horizontal {
                min-width: ${ props.size ?? 1 }px;
            }

            .vertical {
                min-height: ${ props.size ?? 1 }px;
            }`
        } as Widget.BoxProps)
    } as Widget.BoxProps);
}
