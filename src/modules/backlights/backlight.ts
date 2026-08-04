import GObject from "gi://GObject?version=2.0";
import { getter, register, setter, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import { exec } from "ags/process";
import { monitorFile, readFile } from "ags/file";
import type Backlights from ".";

@register({ GTypeName: "Backlight" })
class Backlight extends GObject.Object {
    declare $signals: Backlight.SignalSignatures;

    protected manager: Backlights;
    readonly #name: string;
    #path: string;
    #maxBrightness: number;
    #brightness: number;
    #monitor: Gio.FileMonitor;

    @signal(Number) brightnessChanged(_: number): void {};

    @getter(String)
    get name() { return this.#name; }

    @getter(String)
    get path() { return this.#path; }

    @getter(Boolean)
    get isDefault() { return this.path === this.manager.default?.path; }

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


    // intel_backlight is mostly the default on laptops
    constructor({
        name = "intel_backlight",
        manager
    }: Partial<Backlight.ConstructorProps> = {}) {
        super();

        if(!manager)
            throw new Error("No manager set for Backlight");

        this.manager = manager;

        // check if backlight exists
        if(!Gio.File.new_for_path(`/sys/class/backlight/${name}/brightness`).query_exists(null)) 
            throw new Error(`Brightness: Couldn't find brightness for "${name}"`);

        this.#name = name;
        this.#path = `/sys/class/backlight/${name}`;
        this.notify("path");
        this.#maxBrightness = Number.parseInt(readFile(`${this.#path}/max_brightness`));
        this.notify("max-brightness");
        this.#brightness = Number.parseInt(readFile(`${this.#path}/brightness`))


        this.#monitor = monitorFile(`/sys/class/backlight/${name}/brightness`, () => {
            this.#brightness = this.readBrightness();
            this.notify("brightness");
            this.emit("brightness-changed", this.brightness);
        });
    }

    run_dispose(): void {
        this.#monitor.cancel();
        super.run_dispose();
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

namespace Backlight {
    export interface ConstructorProps extends GObject.Object.ConstructorProps {
        name: string;
        manager: Backlights;
    }
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "brightness-changed": (value: number) => void;
    }
}

export default Backlight;
