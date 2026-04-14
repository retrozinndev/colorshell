import { register } from "ags/gobject";
import { Gdk, Gtk } from "ags/gtk4";
import { omitObjectKeys } from "../modules/utils";
import Gio from "gi://Gio?version=2.0";


// asynchronous image widget.
// loads the provided `image` asynchronously, and can also show a nice spinner
// while loading the image.
// TODO
@register({ GTypeName: "ClshImage" })
export class Image extends Gtk.Widget {
    constructor(props: Image.ConstructorProps) {
        super(omitObjectKeys(props, [
        ]));
    }
}

export namespace Image {
    export interface ConstructorProps extends Gtk.Widget.ConstructorProps {
        path: string;
        file: Gio.File;
        texture: Gdk.Texture;
    }
    export interface SignalSignatures extends Gtk.Widget.SignalSignatures {}
}
