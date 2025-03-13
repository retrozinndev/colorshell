import { register } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { closeRunner } from "../../runner/Runner";

export { ResultWidget, ResultWidgetProps };

type ResultWidgetProps = {
    icon?: string;
    title: string;
    description?: string;
    closeOnClick?: boolean;
    setup?: () => void;
    onClick?: () => void;
};

@register({ GTypeName: "ResultWidget" })
class ResultWidget extends Widget.Box {
    public readonly onClick: (() => void);
    public readonly icon: (string|undefined);
    public readonly setup: ((() => void)|undefined);
    public readonly closeOnClick: boolean = true;


    constructor(props: ResultWidgetProps) {
        super();
        if(props.icon)
            this.icon = props.icon;
        if(props.setup)
            this.setup = props.setup;
        if(props.closeOnClick !== undefined)
            this.closeOnClick = props.closeOnClick;

        this.onClick = () => {
            props.onClick && props.onClick();
            this.closeOnClick && closeRunner();
        };

        this.set_class_name("result");
        this.set_hexpand(true);

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
                    visible: Boolean(props.description),
                    truncate: true,
                    xalign: 0,
                    label: props.description || ""
                } as Widget.LabelProps)
            ]
        } as Widget.BoxProps));
    }
}
