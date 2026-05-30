import { monitorFile, readFile } from "ags/file";
import { exec } from "ags/process";
import { getter, gtype, ParamSpec, register, setter, signal } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";


@register({ GTypeName: "ClshBacklights" })
class Backlights extends GObject.Object {
    declare readonly $signals: Backlights.SignalSignatures;
    declare readonly $readableProperties: Backlights.ReadableProperties;
    declare readonly $readWriteProperties: Backlights.ReadWriteProperties;
    private static instance: Backlights;

    #backlights: Array<Backlights.Backlight> = [];
    #default: Backlights.Backlight|null = null;
    #available: boolean = false;
    

    @getter(Array as unknown as ParamSpec<Array<Backlights.Backlight>>)
    get backlights() { return this.#backlights; }

    @getter(gtype<Backlights.Backlight>(GObject.Object))
    get default() { return this.#default!; }

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
                        name: backlight.get_name()
                    }));
                } catch(_) {}
            }
        } catch(_) {
            return [];
        }

        if(backlights.length < 1) {
            if(this.#available) {
                this.#available = false;
                (this as Backlights).notify("available");
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
    @register({ GTypeName: "Backlight" })
    export class Backlight extends GObject.Object {
        declare readonly $signals: Backlight.SignalSignatures;
        declare readonly $constructOnlyProperties: Backlight.ConstructOnlyProperties;

        readonly #name: string;
        #path: string;
        #maxBrightness: number;
        #brightness: number;
        #monitor: Gio.FileMonitor;
        #conn: number;

        @signal(Number) brightnessChanged(_: number): void {};

        @getter(String)
        get name() { return this.#name; }

        @getter(String)
        get path() { return this.#path; }

        @getter(Boolean)
        get isDefault() { return this.path === Backlights.getDefault().default?.path; }

        @getter(Number) 
        get brightness() { return this.#brightness; };
        @setter(Number)
        set brightness(level: number) {
            if(!this.writeBrightness(level)) return;

            this.#brightness = level;
            this.notify("brightness");
            (this as Backlight).emit("brightness-changed", level);
        }

        @getter(Number) 
        get maxBrightness() { return this.#maxBrightness;};


        // intel_backlight is mostly the default on laptops
        constructor({
            name = "intel_backlight"
        }: Partial<GObject.ConstructorProps<Backlight>> = {}) {
            super();

            // check if backlight exists
            if(!Gio.File.new_for_path(`/sys/class/backlight/${name}/brightness`).query_exists(null)) 
                throw new Error(`Brightness: Couldn't find brightness for "${name}"`);

            // notify :is-default on default backlight change
            this.#conn = Backlights.getDefault().connect("notify::default", () => 
                this.notify("is-default"));

            this.#name = name;
            this.#path = `/sys/class/backlight/${name}`;
            this.notify("path");
            this.#maxBrightness = Number.parseInt(readFile(`${this.#path}/max_brightness`));
            this.notify("max-brightness");
            this.#brightness = Number.parseInt(readFile(`${this.#path}/brightness`))


            this.#monitor = monitorFile(`/sys/class/backlight/${name}/brightness`, () => {
                this.#brightness = this.readBrightness();
                this.notify("brightness");
                (this as Backlight).emit("brightness-changed", this.brightness);
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
                exec(`brightnessctl -d ${this.#name} s ${level}`);
                return true;
            } catch(e) {
                console.error(`Backlight: Couldn't set brightness for "${this.#name}". Stderr: ${e}`);
            }

            return false;
        }
    }

    export namespace Backlight {
        export interface ConstructOnlyProperties extends GObject.Object.ConstructOnlyProperties {
            name: string;
        }
        export interface SignalSignatures extends GObject.Object.SignalSignatures {
            "notify::brightness"(): void;
            "notify::name"(): void;
            "notify::path"(): void;
            "notify::is-default"(): void;
            "notify::max-brightness"(): void;

            "brightness-changed"(value: number): void;
        }
    }

    export interface ReadWriteProperties extends GObject.Object.ReadWriteProperties {}
    export interface ReadableProperties extends GObject.Object.ReadableProperties {}
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify::default"(): void;
        "notify::available"(): void;
        "notify::backlights"(): void;
    }
}

export default Backlights;
