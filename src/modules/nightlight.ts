import { execAsync, exec } from "ags/process";
import { userData } from "../config";
import GObject, { getter, register, setter } from "ags/gobject";

import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "NightLight" })
export class NightLight extends GObject.Object {
    private static instance: NightLight;

    public static readonly maxTemperature = 20000;
    public static readonly minTemperature = 1000;
    public static readonly identityTemperature = 6000;
    public static readonly maxGamma = 100;

    #watchInterval: GLib.Source;
    #temperature: number = NightLight.identityTemperature;
    #gamma: number = NightLight.maxGamma;
    #identity: boolean = false;

    @getter(Number)
    public get temperature() { return this.#temperature; }
    @setter(Number)
    public set temperature(newValue: number) { this.setTemperature(newValue); }

    @getter(Number)
    public get gamma() { return this.#gamma; }
    @setter(Number)
    public set gamma(newValue: number) { this.setGamma(newValue); }

    @getter(Boolean)
    public get identity() { return this.#identity; }
    @setter(Boolean)
    public set identity(val: boolean) {
        if(this.#identity === val)
            return;

        val ? this.applyIdentity() : this.filter();
        this.#identity = val;
        this.notify("identity");
    }

    constructor() {
        super();

        this.loadData();
        this.#watchInterval = setInterval(() => this.syncData(), 10000);
    }

    vfunc_dispose(): void {
        this.#watchInterval.destroy();
    }

    public static getDefault(): NightLight {
        if(!this.instance)
            this.instance = new NightLight();

        return this.instance;
    }

    private syncData(): void {
        execAsync("hyprctl hyprsunset temperature").then(t => {
            if(t.trim() !== "" && t.trim().length <= 5) {
                const val = Number.parseInt(t.trim());

                if(this.#temperature !== val) {
                    this.identity = val === NightLight.identityTemperature;
                    this.#temperature = val;
                    this.notify("temperature");
                }
            }
        }).catch((r: Error) => console.error(`Night Light: Couldn't sync temperature. Stderr: ${
            r.message}\n${r.stack}`));

        execAsync("hyprctl hyprsunset gamma").then(g => {
            if(g.trim() !== "" && g.trim().length <= 5) {
                const val = Number.parseInt(g.trim());

                if(this.#gamma !== val) {
                    this.identity = val === NightLight.maxGamma;
                    this.#gamma = val;
                    this.notify("gamma");
                }
            }
        }).catch((r: Error) => console.error(`Night Light: Couldn't sync. Stderr: ${
            r.message}\n${r.stack}`));
    }

    private setTemperature(value: number): void {
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

    private setGamma(value: number): void {
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

    public applyIdentity(): void {
        this.dispatch("identity");

        if(!this.#identity) {
            this.#identity = true;
            this.notify("identity");
        }
    }

    private dispatch(call: "temperature", val: number): string;
    private dispatch(call: "gamma", val: number): string;
    private dispatch(call: "identity"): string;

    private dispatch(call: "temperature"|"gamma"|"identity", val?: number): string {
        return exec(`hyprctl hyprsunset ${call}${val != null ? ` ${val}` : ""}`);
    }

    private async dispatchAsync(call: "temperature", val: number): Promise<string>;
    private async dispatchAsync(call: "gamma", val: number): Promise<string>;
    private async dispatchAsync(call: "identity"): Promise<string>;

    private async dispatchAsync(call: "temperature"|"gamma"|"identity", val?: number): Promise<string> {
        return await execAsync(`hyprctl hyprsunset ${call}${val != null ? ` ${val}` : ""}`);
    }

    public filter(): void {
        this.setTemperature(this.temperature);
        this.setGamma(this.gamma);

        if(this.#identity) {
            this.#identity = false;
            this.notify("identity");
        }
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
