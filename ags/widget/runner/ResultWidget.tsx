import { Accessor, With } from "ags";
import { register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import Pango from "gi://Pango?version=1.0";
import { variableToBoolean } from "../../scripts/utils";

export { ResultWidget, ResultWidgetProps };

type ResultWidgetProps = {
    icon?: string | Accessor<string> | JSX.Element | Accessor<JSX.Element>;
    title: string | Accessor<string>;
    description?: string | Accessor<string>;
    closeOnClick?: boolean;
    setup?: () => void;
    onClick?: () => void;
};

@register({ GTypeName: "ResultWidget" })
class ResultWidget extends Gtk.Box {

    public readonly onClick: () => void;
    public readonly setup?: () => void;
    public icon?: (string | Accessor<string> | JSX.Element | Accessor<JSX.Element>);
    public closeOnClick: boolean = true;


    constructor(props: ResultWidgetProps) {
        super({
            cssClasses: ["result"],
            hexpand: true
        });

        this.icon = props.icon;
        this.setup = props.setup;
        this.closeOnClick = props.closeOnClick ?? true;
        this.onClick = () => props.onClick?.();

        if(this.icon !== undefined) {
            if(this.icon instanceof Accessor) {
                if(typeof this.icon.get() === "string") {
                    this.prepend(<Gtk.Image iconName={
                        this.icon as Accessor<string>
                    } /> as Gtk.Image);
                } else {
                    this.prepend(<Gtk.Box>
                        <With value={this.icon as Accessor<Gtk.Widget>}>
                            {(widget) => widget}
                        </With>
                    </Gtk.Box> as Gtk.Box);
                }
            } else {
                if(typeof this.icon === "string") 
                    this.prepend(<Gtk.Image iconName={this.icon as string} /> as Gtk.Image);
                else 
                    this.prepend(this.icon as Gtk.Widget);
            }
        }

        this.append(<Gtk.Box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <Gtk.Label class={"title"} xalign={0} ellipsize={Pango.EllipsizeMode.END}
              label={props.title} />

            <Gtk.Label class={"description"} visible={variableToBoolean(props.description)}
              ellipsize={Pango.EllipsizeMode.END} xalign={0} label={props.description ?? ""} />
        </Gtk.Box> as Gtk.Box);
    }
}
