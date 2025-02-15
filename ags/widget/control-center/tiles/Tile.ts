import { Binding } from "astal";
import { Gtk, Widget } from "astal/gtk3";

export type TileProps = {
    className?: string | Binding<string | undefined>;
    iconName?: string | Binding<string | undefined>;
    visible?: boolean | Binding<boolean | undefined>;
    iconSize?: number | Binding<number | undefined>;
    title: string | Binding<string>;
    description?: string | Binding<string | undefined>;
    defaultToggleState?: boolean;
    onToggledOn: () => void;
    onToggledOff: () => void;
    onClickMore?: () => void;
}

export function Tile(props: TileProps): Widget.Box {

    const toggleButton = new Gtk.ToggleButton();
    toggleButton.set_active(props.defaultToggleState || false);

    const moreButton = new Widget.Button({
        className: "more",
        visible: props.onClickMore 
    });

    return new Widget.Box({
        className: (typeof Binding<string | undefined>) === (typeof props.className) ? 
            (props.className as Binding<string | undefined>).as((clsName: (string|undefined)) => 
                `tile ${clsName || ""}`)
        : 
            props.className,
        visible: props.visible,
        children: [
            toggleButton,
            moreButton
        ]
    })
}
