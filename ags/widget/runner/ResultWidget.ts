import { Binding, register } from "astal";
import { Gtk, Widget } from "astal/gtk3";

export { ResultWidget, ResultWidgetProps };

type ResultWidgetProps = {
    icon?: string | Binding<string> | Gtk.Widget | Binding<Gtk.Widget>;
    title: string | Binding<string | undefined>;
    description?: string | Binding<string | undefined>;
    closeOnClick?: boolean;
    setup?: () => void;
    onClick?: () => void;
};

@register({ GTypeName: "ResultWidget" })
class ResultWidget extends Widget.Box {

    public readonly onClick: (() => void);
    public readonly setup: ((() => void)|undefined);
    public icon: (string | Binding<string> | Gtk.Widget | Binding<Gtk.Widget> | undefined);
    public closeOnClick: boolean = true;


    constructor(props: ResultWidgetProps) {
        super({
            className: "result",
            hexpand: true
        });

        this.icon = props.icon;
        this.setup = props.setup;
        this.closeOnClick = props.closeOnClick ?? true;
        this.onClick = () => props.onClick?.();

        if(this.icon !== undefined) {
            if(this.icon instanceof Binding) {
                if(typeof this.icon.get() === "string") {
                    this.add(new Widget.Icon({
                        icon: this.icon as Binding<string>
                    } as Widget.IconProps));
                } else {
                    this.add(new Widget.Box({
                        child: this.icon as Binding<Gtk.Widget>
                    } as Widget.BoxProps));
                }
            } else {
                if(typeof this.icon === "string") {
                    this.add(new Widget.Icon({
                        icon: this.icon as string
                    } as Widget.IconProps));
                } else 
                    this.add(this.icon as Gtk.Widget);
            }
        }

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
