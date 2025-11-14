import { gtype, property, register, signal } from "ags/gobject";
import Adw from "gi://Adw?version=1";
import { omitObjectKeys } from "../../../modules/utils";
import { Gtk } from "ags/gtk4";
import { createBinding } from "ags";
import Pango from "gi://Pango?version=1.0";


register({ GTypeName: "ClshTabButton" })
export class TabButton extends Adw.Bin {

    declare $signals: Adw.Bin.SignalSignatures & {
        "clicked": (posX: number, posY: number) => void;
    };

    @signal(Number, Number)
    clicked(_: number, __: number) {}

    @property(String)
    iconName: string;

    @property(String)
    label: string;

    @property(gtype<Pango.EllipsizeMode>(Number))
    ellipsize: Pango.EllipsizeMode = Pango.EllipsizeMode.END;

    constructor(props: {
        iconName: string;
        label: string;
        ellipsize?: Pango.EllipsizeMode;
    } & Partial<Adw.Bin.ConstructorProps>) {
        super({
            cssName: "tabbutton",
            ...omitObjectKeys(props, [
                "iconName", 
                "label", 
                "ellipsize"
            ])
        });

        this.iconName = props.iconName;
        this.label = props.label;

        if(props.ellipsize !== undefined)
            this.ellipsize = props.ellipsize;

        this.set_child(
            <Gtk.Box cssName={"tabbuttonchild"} spacing={6}>
                <Gtk.Image iconName={createBinding(this, "iconName")} hexpand={false} />
                <Gtk.Label label={createBinding(this, "label")} hexpand 
                  ellipsize={createBinding(this, "ellipsize")}
                />
            </Gtk.Box> as Gtk.Box
        );
    }
}
