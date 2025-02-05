import { Binding, Variable } from "astal";
import { Gtk, Widget } from "astal/gtk3";

export interface NormalTileProps {
    className?: string | Binding<string | undefined>;
    iconName?: string | Binding<string | undefined>;
    iconSize?: Gtk.IconSize;
    title: string | Binding<string>;
    description?: string | Binding<string | undefined>;
    toggleState?: boolean | Binding<boolean | undefined>;
    onToggledOn: Function;
    onToggledOff: Function;
}

export function MoreTile(props: NormalTileProps): Gtk.Widget {

    const mainEventBox = new Widget.EventBox({
        onClick: () => toggleState ? props.onToggledOff() : props.onToggledOn(),
        expand: true,
        child: new Widget.Box({
            className: props?.className || "",
            expand: true,
            children: [
                new Widget.Icon({
                    iconName: props?.iconName,
                    visible: props.iconName !== undefined,
                    iconSize: props.iconSize || Gtk.IconSize.BUTTON
                }),
                new Widget.Box({
                    className: "text",
                    orientation: Gtk.Orientation.VERTICAL,
                    children: [
                        new Widget.Label({
                            className: "title",
                            label: props.title
                        } as Widget.LabelProps),
                        new Widget.Label({
                            className: "description",
                            visible: props?.description !== undefined,
                            label: props?.description
                        } as Widget.LabelProps)
                    ]
                } as Widget.BoxProps)
            ]
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);

    function toggleOn(): void {
        mainEventBox.set_class_name(mainEventBox + "")
        props.onToggledOn();
    }

    function toggleOff(): void {
        props.onToggledOff();
    }

    return mainEventBox;
}
