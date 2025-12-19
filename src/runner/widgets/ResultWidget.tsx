import { getter, gtype, property, register, setter, signal } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import { variableToBoolean } from "../../modules/utils";

import Pango from "gi://Pango?version=1.0";
import GdkPixbuf from "gi://GdkPixbuf?version=2.0";


export type ResultWidgetProps = {
    icon?: string | GdkPixbuf.Pixbuf | Gtk.Widget | JSX.Element;
    title: string;
    description?: string;
    closeOnClick?: boolean;
    setup?: () => void;
    actionClick?: () => void;
    visible?: boolean;
};

@register({ GTypeName: "ResultWidget" })
export class ResultWidget extends Gtk.Box {

    declare $signals: ResultWidget.SignalSignatures;
    #icon: string|Gtk.Widget|GdkPixbuf.Pixbuf|null = null;

    public readonly actionClick: () => void;
    public readonly setup?: () => void;

    @signal()
    selected() {}

    @signal()
    unselected() {}

    @property(Boolean)
    closeOnClick: boolean = true;

    @getter(gtype<string|Gtk.Widget|GdkPixbuf.Pixbuf|null>(Object))
    get icon() { return this.#icon; }

    @setter(gtype<string|Gtk.Widget|GdkPixbuf.Pixbuf|null>(Object))
    set icon(newIcon: string|Gtk.Widget|GdkPixbuf.Pixbuf|null) {
        this.set_icon(newIcon);
    }

    constructor(props: ResultWidgetProps & Partial<Gtk.Box.ConstructorProps>) {
        super();

        this.add_css_class("result");

        this.visible = props.visible ?? true;
        this.hexpand = true;
        this.setup = props.setup;
        this.closeOnClick = props.closeOnClick ?? true;
        this.actionClick = () => props.actionClick?.();

        this.append(<Gtk.Box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <Gtk.Label class={"title"} xalign={0} ellipsize={Pango.EllipsizeMode.END}
              label={props.title} />

            <Gtk.Label class={"description"} visible={variableToBoolean(props.description)}
              ellipsize={Pango.EllipsizeMode.END} xalign={0} label={props.description ?? ""} />
        </Gtk.Box> as Gtk.Box);

        
        if(props.icon !== undefined) 
            this.set_icon(props.icon as Gtk.Widget|string|GdkPixbuf.Pixbuf);
    }

    /** it is recommended to not change the custom widget's name. */
    set_icon(icon: string|Gtk.Widget|GdkPixbuf.Pixbuf|null): void {
        const firstChild = this.get_first_child();

        if(icon === null && firstChild?.name !== undefined &&
           /^(custom\-)?icon\-widget$/.test(firstChild?.name)) {

            this.remove(firstChild);
            return;
        }

        if(firstChild && firstChild.name === "icon-widget" && 
           firstChild instanceof Gtk.Image) {

            if(typeof icon === "string") {
                firstChild.set_from_icon_name(icon);
                this.#icon = icon;
                this.notify("icon");
                return;
            }

            if(icon instanceof GdkPixbuf.Pixbuf) {
                firstChild.set_from_pixbuf(icon);
                this.#icon = icon;
                this.notify("icon");
                return;
            }

            // remove if we're not going to use it
            this.remove(firstChild);
        }

        if(icon instanceof Gtk.Widget) {
            if(firstChild?.name === "custom-icon-widget")
                this.remove(firstChild);

            this.prepend(icon);
            this.#icon = this.get_first_child();
            this.notify("icon");
            return;
        }

        this.prepend(
            <Gtk.Image name={"icon-widget"} $={(self) => {
                if(typeof icon === "string") {
                    self.set_from_icon_name(icon);
                    this.#icon = icon;
                    this.notify("icon");
                    return;
                }

                self.set_from_pixbuf(icon);
                this.#icon = icon;
                this.notify("icon");
            }} /> as Gtk.Image
        );
    }

    connect<S extends keyof ResultWidget.SignalSignatures>(
        signal: S,
        callback: (self: ResultWidget, ...params: Parameters<ResultWidget.SignalSignatures[S]>) => ReturnType<ResultWidget.SignalSignatures[S]>
    ): number {
        return super.connect(signal, callback);
    }

    emit<S extends keyof ResultWidget.SignalSignatures>(
        signal: S, 
        ...args: Parameters<ResultWidget.SignalSignatures[S]>
    ): void {
        super.emit(signal, ...args);
    }
}

export namespace ResultWidget {
    export interface SignalSignatures extends Gtk.Box.SignalSignatures {
        "selected": () => void;
        "unselected": () => void;
    }
}
