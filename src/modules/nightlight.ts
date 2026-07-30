import { execAsync } from "ags/process";
import { userData } from "../config";
import { getPID  } from "./utils";
import GObject, { getter, register, setter } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "ClshNightLight" })
class NightLight extends GObject.Object {
    private static instance: NightLight;

    public static readonly maxTemperature = 20000;
    public static readonly minTemperature = 1000;
    public static readonly identityTemperature = 6000;
    public static readonly maxGamma = 100;
    public static readonly gammaOverflow = 200;

    #temperature: number = NightLight.identityTemperature;
    #gamma: number = NightLight.maxGamma;
    #identity: boolean = true;
    #available: boolean = true;

    @getter(Number)
    public get temperature() { return this.#temperature; }
    @setter(Number)
    public set temperature(value: number) {
        if(value === this.temperature && !this.identity) return;

        if(value > NightLight.maxTemperature || value < 1000) {
            console.error(`Night Light: provided temperatue ${value
                } is out of bounds (min: 1000; max: ${NightLight.maxTemperature})`);
            return;
        }

        this.dispatchAsync("temperature", value).then(() => {
            this.#temperature = value;
            this.notify("temperature");

            this.identity = false;
        }).catch((r: Error) => console.error(
            `Night Light: Couldn't set temperature. Stderr: ${r.message}\n${r.stack}`
        ));
    }

    @getter(Number)
    public get gamma() { return this.#gamma; }
    @setter(Number)
    public set gamma(value: number) {
        if(value === this.gamma && !this.identity) return;

        if(value > NightLight.maxGamma || value < 0) {
            console.error(`Night Light: provided gamma ${value
                } is out of bounds (min: 0; max: ${NightLight.maxTemperature})`);
            return;
        }

        this.dispatchAsync("gamma", value).then(() => {
            this.#gamma = value;
            this.notify("gamma");

            this.identity = false;
        }).catch((r: Error) => console.error(
            `Night Light: Couldn't set gamma. Stderr: ${r.message}\n${r.stack}`
        ));
    }

    @getter(Boolean)
    public get identity() { return this.#identity; }
    @setter(Boolean)
    public set identity(val: boolean) {
        if(this.#identity === val)
            return;

        this.dispatchAsync("identity", val).then(() => {
            this.#identity = val;
            this.notify("identity");
        }).catch(console.error);
    }

    @getter(Boolean)
    get available() {
        return this.#available;
    }

    constructor() {
        super();

        // this is problematic, since we don't want to only support hyprland...
        const instanceSig = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
        if(instanceSig === null || instanceSig.trim() === "") {
            console.error("Night Light: Failed to initialize socket: HYPRLAND_INSTANCE_SIGNATURE \
isn't set(are you running on Hyprland?)");
            return;
        }

        const pid = getPID("hyprsunset");
        if(pid == null) {
            console.warn("NightLight: Either `hyprsunset` is not running or it couldn't be detected");
            this.#available = false;
        }

        const id = this.connect("notify::available", () => {
            if(!this.#available)
                return;

            this.disconnect(id);
            this.loadData();
        });

        if(this.available)
            this.notify("available");
    }

    public static init(): NightLight {
        if(!this.instance)
            this.instance = new NightLight();

        return this.instance;
    }

    public static getDefault(): NightLight {
        return this.init();
    }

    public sync(): void {
        if(!this.#available)
            return;

        this.dispatchAsync("temperature").then(str => {
            const level = Number.parseInt(str);
            if(level === this.temperature)
                return;

            this.#temperature = level;
            this.notify("temperature");
        }).catch(console.error);

        this.dispatchAsync("gamma").then(str => {
            const level = Number.parseInt(str);
            if(level === this.gamma)
                return;

            this.#gamma = level;
            this.notify("gamma");
        }).catch(console.error);

        this.dispatchAsync("identity", "get").then(str => {
            const enabled = str.trim() === "true";
            if(this.identity === enabled)
                return;

            this.#identity = enabled;
            this.notify("identity");
        }).catch(console.error);
    }

    private async dispatchAsync(call: "temperature", val?: number): Promise<string>;
    private async dispatchAsync(call: "gamma", val?: number): Promise<string>;
    private async dispatchAsync(call: "identity", val?: "get"|boolean): Promise<string>;
    private async dispatchAsync(call: "temperature"|"gamma"|"identity", val?: number|string|boolean): Promise<string> {
        return await execAsync(`/usr/bin/env hyprctl hyprsunset ${call}${val != null ? ` ${val}` : ""}`);
    }

    public saveData(): void {
        userData.setProperty("night_light.temperature", this.#temperature);
        userData.setProperty("night_light.gamma", this.#gamma);
        userData.setProperty("night_light.identity", this.#identity, true);
    }

    /** load temperature, gamma and identity(off/on) properties from the user configuration */
    public loadData(): void {
        const identity = userData.getProperty("night_light.identity", "boolean");
        const temperature = userData.getProperty("night_light.temperature", "number");
        const gamma = userData.getProperty("night_light.gamma", "number");

        if(identity) {
            this.#temperature = temperature;
            this.notify("temperature");
            this.#gamma = gamma;
            this.notify("gamma");
        } else {
            this.temperature = temperature;
            this.gamma = gamma;
        }

        this.#identity = identity;
        this.notify("identity");
    }
}

export default NightLight;
