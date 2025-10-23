import { Accessor } from "ags";
import { Gtk } from "ags/gtk4";


export interface SeparatorProps {
    class?: string;
    alpha?: number;
    cssColor?: string;
    orientation?: Gtk.Orientation;
    size?: number;
    spacing?: number;
    margin?: number;
    visible?: boolean | Accessor<boolean>;
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

    return <Gtk.Box name={"separator"} vexpand={props.orientation === Gtk.Orientation.HORIZONTAL}
      hexpand={props.orientation === Gtk.Orientation.VERTICAL}
      class={`separator ${ props.orientation === Gtk.Orientation.VERTICAL ? 
        "vertical" : "horizontal" }`} visible={props.visible}
      css={`.vertical { padding: ${props.spacing ?? 0}px ${props.margin ?? 7}px; }
        .horizontal { padding: ${props.margin ?? 4}px ${props.spacing ?? 0}px; }`}>

        <Gtk.Box class={`${props.orientation === Gtk.Orientation.VERTICAL ? 
            "vertical"
          : "horizontal"} ${props.class ?? ""}`}
          vexpand={props.orientation === Gtk.Orientation.HORIZONTAL}
          hexpand={props.orientation === Gtk.Orientation.VERTICAL}
            
            css={`* {
              background: ${ props.cssColor ?? "lightgray" };
              opacity: ${props.alpha};
            }
            .horizontal { min-width: ${ props.size ?? 1 }px; }
            .vertical { min-height: ${ props.size ?? 1 }px; }`} 
        />
    </Gtk.Box>
}
