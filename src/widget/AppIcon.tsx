import { getter, gtype, register, setter } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import Gio from "gi://Gio?version=2.0";
import { omitObjectKeys } from "../modules/utils";
import { lookupIcon } from "../modules/apps";


@register({ GTypeName: "ClshAppIcon" })
class AppIcon extends Gtk.Image {
    #icon: string|null = "application-x-executable-symbolic";

    @getter(gtype<string|null>(String))
    get icon() { return this.#icon; }

    @setter(gtype<string|null>(String))
    set icon(newIcon: string|null) {
        if(newIcon === null) {
            this.#icon = "application-x-executable-symbolic";
            this.set_from_icon_name(this.#icon);
            this.notify("icon");
            return;
        }

        if(/^[/~]/.test(newIcon)) {
            this.set_from_file(newIcon);
            this.#icon = newIcon;
            this.notify("icon");
            return;
        }

        if(!lookupIcon(newIcon)) {
            this.#icon = "application-x-executable-symbolic";
            this.set_from_icon_name(this.#icon);
            this.notify("icon");
            return;
        }

        this.set_from_icon_name(newIcon);
        this.#icon = newIcon;
        this.notify("icon");
    }

    constructor(props: Partial<AppIcon.ConstructorProps> = {}) {
        super({
            iconName: "application-x-executable-symbolic",
            ...omitObjectKeys(props, [
                "icon"
            ])
        });

        if(props.icon !== undefined && props.icon !== null)
            this.icon = typeof props.icon === "object" ?
                props.icon.peek_path()!
            : props.icon;
    }
}

namespace AppIcon {
    export interface SignalSignatures extends Gtk.Image.SignalSignatures {}
    export interface ConstructorProps extends Gtk.Image.ConstructorProps {
        icon: string|Gio.File|null;
    }
}

export default AppIcon;
