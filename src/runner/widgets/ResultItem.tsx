import { gtype, property, register, signal } from "ags/gobject";
import { Gdk, Gtk } from "ags/gtk4";
import { createScopedConnection, omitObjectKeys, variableToBoolean } from "../../modules/utils";
import { createBinding, With } from "ags";
import Runner from "..";
import Pango from "gi://Pango?version=1.0";
import Adw from "gi://Adw?version=1";
import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "ResultWidget" })
class ResultItem extends Gtk.ListBoxRow {
    declare $signals: ResultItem.SignalSignatures;
    #timeout: GLib.Source|null = null;

    @signal()
    protected clicked() {
        if(!this.closeOnClick)
            return;

        Runner.close();
    }
    @signal()
    protected hovered() {}
    @signal()
    protected unhovered() {}
    @signal()
    protected selected() {}
    @signal()
    protected unselected() {}


    @property(Boolean)
    closeOnClick: boolean = true;

    @property(String)
    title: string = "";

    @property(gtype<string|null>(String))
    description: string|null = null;

    @property(gtype<string|Gtk.Widget|Gdk.Texture|null>(Object))
    icon: string|Gtk.Widget|Gdk.Texture|null = null;

    @property(Number)
    clickTimeout: number = 300;


    constructor(props: ResultItem.ConstructorProps) {
        super({
            cssName: "resultitem",
            ...omitObjectKeys(props, [
                "icon",
                "title",
                "description",
                "closeOnClick"
            ])
        });

        if(props.icon !== undefined && props.icon !== null)
            this.icon = props.icon;

        if(props.title !== undefined)
            this.title = props.title;

        if(props.description !== undefined && props.description !== null)
            this.description = props.description;

        this.visible = props.visible ?? true;
        this.hexpand = true;
        this.closeOnClick = props.closeOnClick ?? true;

        const gesture = Gtk.GestureClick.new();
        this.add_controller(gesture);

        createScopedConnection(
            gesture, "released", () => {
                if(this.#timeout || gesture.get_button() !== Gdk.BUTTON_PRIMARY)
                    return;

                this.#timeout = setTimeout(() => this.#timeout = null, this.clickTimeout);
                this.emit("clicked");
            }
        );

        this.set_child(
            <Gtk.Box>
                <Adw.Bin>
                    <With value={createBinding(this, "icon")}>
                        {(icon: string|Gtk.Widget|Gdk.Texture|null) =>
                            typeof icon === "string" ?
                                <Gtk.Image iconName={icon} />
                            : icon == null ?
                                null
                            : icon instanceof Gtk.Widget ?
                                icon
                            : icon instanceof Gdk.Texture ?
                                <Gtk.Image paintable={icon} />
                            : null
                        }
                    </With>
                </Adw.Bin>
                <Gtk.Box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} hexpand>
                    <Gtk.Label class={"title"} xalign={0} ellipsize={Pango.EllipsizeMode.END}
                      label={props.title} />

                    <Gtk.Label class={"description"} visible={variableToBoolean(props.description)}
                      ellipsize={Pango.EllipsizeMode.END} xalign={0} label={props.description ?? ""} />
                </Gtk.Box>
            </Gtk.Box> as Gtk.Box
        );

        this.add_controller(
            <Gtk.EventControllerMotion onEnter={() => this.emit("hovered")}
              onLeave={() => this.emit("unhovered")}
            /> as Gtk.EventControllerMotion
        );
    }
}

namespace ResultItem {
    export interface ConstructorProps extends Partial<Gtk.ListBoxRow> {
        icon?: string|Gdk.Texture|Gtk.Widget;
        title: string;
        description?: string;
        closeOnClick?: boolean;
    };

    export interface SignalSignatures extends Gtk.ListBoxRow.SignalSignatures {
        "clicked": () => void;
        "selected": () => void;
        "unselected": () => void;
        "hovered": () => void;
        "unhovered": () => void;
    }
}

export default ResultItem;
