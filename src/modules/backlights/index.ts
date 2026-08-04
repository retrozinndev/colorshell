import GObject, { getter, gtype, register } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import _Backlight from "./backlight";


@register({ GTypeName: "ClshBacklights" })
class Backlights extends GObject.Object {
    private static instance: Backlights;

    #backlights: Array<Backlights.Backlight> = [];
    #default: Backlights.Backlight|null = null;
    #available: boolean = false;
    

    @getter(Array<Backlights.Backlight>)
    get backlights() { return this.#backlights; }

    @getter(gtype<Backlights.Backlight>(GObject.Object))
    get default() { return this.#default!; }
    private set default(v: Backlights.Backlight) {
        this.#default = v;
        this.notify("default");
        this.#default.notify("is-default");
    }

    /** true if there are any backlights available */
    @getter(Boolean)
    get available() { return this.#available; }

    public scan(): Array<Backlights.Backlight> {
        const dir = Gio.File.new_for_path(`/sys/class/backlight`),
            backlights: Array<Backlights.Backlight> = [];

        let fileEnum: Gio.FileEnumerator;

        try {
            fileEnum = dir.enumerate_children("standard::*", Gio.FileQueryInfoFlags.NONE, null);
            for(const backlight of fileEnum) {
                try {
                    backlights.push(new Backlights.Backlight({
                        name: backlight.get_name(),
                        manager: this
                    }));
                } catch(_) {}
            }
        } catch(_) {
            return [];
        }

        if(backlights.length < 1) {
            if(this.#available) {
                this.#available = false;
                this.notify("available");
            }

            this.#default = null;
            this.notify("default");
        }

        if(backlights.length > 0) {
            if(this.#backlights.length < 1) {
                this.#available = true;
                this.notify("available");
            }

            if(!this.#default || !backlights.filter(bk => bk.path === this.#default?.path)[0]) {
                this.#default = backlights[0];
                this.notify("default");
            }
        }

        this.#backlights = backlights;
        this.notify("backlights");

        return backlights;
    }

    public setDefault(bk: Backlights.Backlight): void {
        this.#default = bk;
        this.notify("default");
    }

    constructor(scan: boolean = true) {
        super();
        scan && this.scan();
    }

    public static getDefault(): Backlights {
        if(!this.instance)
            this.instance = new Backlights();

        return this.instance;
    }
}


namespace Backlights {
    export import Backlight = _Backlight;
}

export default Backlights;
