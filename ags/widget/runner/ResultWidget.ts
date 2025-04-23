import { Binding, register } from "astal";
import { Gtk, Widget } from "astal/gtk3";

export { ResultWidget, ResultWidgetProps };

type ResultWidgetProps = {
    icon?: string | Binding<string | undefined>;
    title: string | Binding<string | undefined>;
    description?: string | Binding<string | undefined>;
    closeOnClick?: boolean;
    setup?: () => void;
    onClick?: () => void;
};

@register({ GTypeName: "ResultWidget" })
class ResultWidget extends Widget.Box {
    public readonly onClick: (() => void);
    public readonly icon: (string | Binding<string|undefined> | undefined);
    public readonly setup: ((() => void)|undefined);
    public readonly closeOnClick: boolean = true;


    constructor(props: ResultWidgetProps) {
        super({
            className: "result",
            hexpand: true
        });

        this.icon = props.icon;
        this.setup = props.setup;
        this.closeOnClick = props.closeOnClick ?? true;
        this.onClick = () => props.onClick?.();

        this.add(new Widget.Icon({
            visible: Boolean(props.icon),
            icon: props.icon || "image-missing"
        } as Widget.IconProps));

        this.add(new Widget.Box({
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.CENTER,
            children: [
                new Widget.Label({
                    className: "title",
                    xalign: 0,
                    truncate: true,
                    label: props.title
                } as Widget.LabelProps),
                new Widget.Label({
                    className: "description",
                    visible: (props.description instanceof Binding) ? 
                        props.description.as(Boolean)
                    : Boolean(props.description),
                    truncate: true,
                    xalign: 0,
                    label: props.description || ""
                } as Widget.LabelProps)
            ]
        } as Widget.BoxProps));
    }
}
