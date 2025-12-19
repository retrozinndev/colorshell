import { property, register } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import Gsk from "gi://Gsk?version=4.0";
import { omitObjectKeys } from "../modules/utils";
import Graphene from "gi://Graphene?version=1.0";


// TODO fix ts

@register({ GTypeName: "ClshRoundedPicture" })
export class RoundedPicture extends Gtk.Picture implements Gtk.Picture {
    declare $signals: Gtk.Picture.SignalSignatures & {
        "notify::rounding": () => void;
    };

    #roundedClip!: Gsk.RoundedClipNode;

    @property(Number)
    rounding: number = 0;

    constructor(props: {
        rounding: number;
    } & Partial<Gtk.Picture.ConstructorProps>) {
        super(omitObjectKeys(props, ["rounding"]));

        if(props.rounding !== undefined)
            this.rounding = props.rounding;
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot): void {
        snapshot.save();
        this.#roundedClip = Gsk.RoundedClipNode.new(
            snapshot.to_node()!,
            new Gsk.RoundedRect()
        );

        this.#roundedClip.get_clip().init(
            this.#roundedClip.get_bounds(),
            new Graphene.Size({
                width: this.rounding,
                height: this.rounding
            }),
            new Graphene.Size({
                width: this.rounding,
                height: this.rounding
            }),
            new Graphene.Size({
                width: this.rounding,
                height: this.rounding
            }),
            new Graphene.Size({
                width: this.rounding,
                height: this.rounding
            })
        );
        this.#roundedClip.get_clip().normalize();

        snapshot.append_node(this.#roundedClip);
        snapshot.restore();
    }
}
