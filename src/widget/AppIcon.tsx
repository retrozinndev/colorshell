import { getter, gtype, register, setter } from "ags/gobject";
import { Gtk } from "ags/gtk4";
import Gio from "gi://Gio?version=2.0";
import { omitObjectKeys } from "../modules/utils";
import { lookupIcon } from "../modules/apps";
import GObject from "gi://GObject?version=2.0";


@register({ GTypeName: "ClshAppIcon" })
class AppIcon extends Gtk.Image {
    declare readonly $signals: AppIcon.SignalSignatures;
    declare readonly $readWriteProperties: AppIcon.ReadWriteProperties;

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

    constructor(props: Partial<GObject.ConstructorProps<AppIcon>> = {}) {
        super({
            iconName: "application-x-executable-symbolic",
            ...omitObjectKeys(props, [
                "icon"
            ])
        });

        if(props.icon !== undefined)
            this.icon = typeof props.icon === "object" ?
                props.icon!.peek_path()!
            : props.icon;
    }
}

namespace AppIcon {
    export interface SignalSignatures extends Gtk.Image.SignalSignatures {
        "notify::icon"(): void;
    }

    export interface ReadWriteProperties extends Gtk.Image.ReadWriteProperties {
        "icon": Gio.File|string|null;
    }
}

export default AppIcon;
