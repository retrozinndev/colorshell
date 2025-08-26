import { monitorFile, readFile, writeFile } from "ags/file";
import GObject, { getter, ParamSpec, register, setter, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";


export { Backlight };
@register({ GTypeName: "Backlight" })
class Backlight extends GObject.Object {

    private static _backlights: Array<Backlight> = [];
    public static get backlights() {
        return this._backlights;
    };

    private static default: Backlight;

    readonly #name: string;
    #path: string;
    #maxBrightness: number;
    #brightness: number;
    #available: boolean = true;

    @signal(Number) brightnessChanged(_: number): void {};

    @getter(String)
    get path() { return this.#path; }

    @getter(GObject.Object as unknown as ParamSpec<Backlight>)
    get default() { return Backlight.default; }

    @getter(Boolean)
    get isDefault() { return this.path === this.default?.path; }

    @getter(Number) 
    get brightness() { return this.#brightness; };
    @setter(Number)
    set brightness(level: number) {
        if(!this.writeBrightness(level)) return;

        this.#brightness = level;
        this.notify("brightness");
        this.emit("brightness-changed", level);
    }

    @getter(Number) 
    get maxBrightness() { return this.#maxBrightness;};

    @getter(Boolean)
    get available() { return this.#available; }


    declare $signals: GObject.Object.SignalSignatures & {
        "brightness-changed": (value: number) => void
    };

    public static setDefault(backlight: Backlight): void {
        const prev = this.default;
        this.default = backlight;

        prev && prev.notify("is-default");
        backlight.notify("is-default");
        this.backlights.forEach(bk => bk.notify("default"));
    }

    public static amount(): number {
        const dir = Gio.File.new_for_path(`/sys/class/backlight`);
        let num: number = 0,
            fileEnum: Gio.FileEnumerator;

        try {
            fileEnum = dir.enumerate_children("standard::*", Gio.FileQueryInfoFlags.NONE, null);

            for(const _ of fileEnum) 
                num++;
        } catch(_) {
            return num;
        }

        return num;
    }

    public static scan(): Array<Backlight> {
        const dir = Gio.File.new_for_path(`/sys/class/backlight`),
            backlights: Array<Backlight> = [];

        let fileEnum: Gio.FileEnumerator;

        try {
            fileEnum = dir.enumerate_children("standard::*", Gio.FileQueryInfoFlags.NONE, null);
            for(const backlight of fileEnum) {
                try {
                    backlights.push(new Backlight(backlight.get_name()));
                } catch(_) {}
            }
        } catch(_) {
            return [];
        }

        Backlight._backlights = backlights;
        return backlights;
    }

    // intel_backlight is mostly the default on laptops
    constructor(name: string = "intel_backlight") {
        super();

        // check if backlight exists
        if(!Gio.File.new_for_path(`/sys/class/backlight/${name}/brightness`).query_exists(null)) {
            this.#available = false;
            this.notify("available");
            throw new Error(`Brightness: Couldn't find brightness for "${name}"`);
        }

        this.#name = name;
        this.#path = `/sys/class/backlight/${name}`;
        this.notify("path");
        this.#maxBrightness = Number.parseInt(readFile(`${this.#path}/max_brightness`));
        this.notify("max-brightness");
        this.#brightness = Number.parseInt(readFile(`${this.#path}/brightness`))


        monitorFile(`/sys/class/backlight/${name}/brightness`, () => {
            this.#brightness = this.readBrightness();
            this.notify("brightness");
            this.emit("brightness-changed", this.brightness);
        });
    }

    private readBrightness(): number {
        try {
            const brightness = Number.parseInt(readFile(`${this.#path}/brightness`));
            return brightness;
        } catch(e) {
            console.error(`Backlight: An error occurred while reading brightness from "${this.#name}"`);
        }

        return this.#brightness ?? this.#maxBrightness ?? 0;
    }

    private writeBrightness(level: number): boolean {
        try {
            writeFile(`${this.#path}/brightness`, level.toString());
            return true;
        } catch(e) {
            console.error(`Backlight: Couldn't set brightness for "${this.#name}". Stderr: ${e}`);
        }

        return false;
    }

    public static getDefault(): Backlight|null {
        if(this.default) 
            return this.default;

        if(this.backlights.length < 1)
            this.scan();

        const first = this.backlights[0];
        if(first) {
            try {
                this.default = first;
                return this.default;
            } catch(_) {}
        }

        return null;
    }

    public emit<Signal extends keyof typeof this.$signals>(
        signal: Signal,
        ...args: Parameters<(typeof this.$signals)[Signal]>
    ): void {
        super.emit(signal, ...args);
    }
}
