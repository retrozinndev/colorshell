import AstalIO from "gi://AstalIO";
import GLib from "gi://GLib?version=2.0";

import GObject, { getter, register } from "ags/gobject";
import { execAsync, exec } from "ags/process";
import { interval } from "ags/time";

export { NightLight };

@register({ GTypeName: "NightLight" })
class NightLight extends GObject.Object {
    private static instance: NightLight;

    #watchInterval: (AstalIO.Time|null) = null;
    #temperature: number = 4500;
    #gamma: number = 100;
    #identity: boolean = false;

    #prevTemperature: (number|null) = null;
    #prevGamma: (number|null) = null;

    @getter(Number)
    public get temperature() { return this.#temperature; }
    public set temperature(newValue: number) { this.setTemperature(newValue); }

    @getter(Number)
    public get gamma() { return this.#gamma; }
    public set gamma(newValue: number) { this.setGamma(newValue); }

    public readonly maxTemperature = 20000;
    public readonly minTemperature = 1000;
    public readonly identityTemperature = 6000;
    public readonly maxGamma = 100;

    @getter(Boolean)
    public get identity() { return this.#identity; }
    public set identity(newValue: boolean) {
        newValue ? this.applyIdentity() : this.filter();
    }

    constructor() {
        super();

        this.#watchInterval = interval(1000, () => {
            execAsync("hyprctl hyprsunset temperature").then(t => {
                if(t.trim() !== "" && t.trim().length <= 5) {
                    const val = Number.parseInt(t.trim());

                    if(this.#temperature !== val) {
                        this.#temperature = val;
                        this.notify("temperature");
                    }
                }
            }).catch((r) => console.error(r));

            execAsync("hyprctl hyprsunset gamma").then(g => {
                if(g.trim() !== "" && g.trim().length <= 5) {
                    const val = Number.parseInt(g.trim());

                    if(this.#gamma !== val) {
                        this.#gamma = val;
                        this.notify("gamma");
                    }
                }
            }).catch((r) => console.error(r));
        });

        this.vfunc_dispose = () => this.#watchInterval && 
            this.#watchInterval.cancel();
    }

    public static getDefault(): NightLight {
        if(!this.instance)
            this.instance = new NightLight();

        return this.instance;
    }

    private setTemperature(value: number): void {
        if(value === this.temperature) return;

        if(value > this.maxTemperature || value < 1000) {
            console.error(`Night Light(hyprsunset): provided temperatue ${value
                } is out of bounds (min: 1000; max: ${this.maxTemperature})`);
            return;
        }

        execAsync(`hyprctl hyprsunset temperature ${value}`).then(() => {
            this.#temperature = value;
            this.notify("temperature");

            this.#identity = false;
            this.#prevTemperature = null;
            this.#prevGamma = null;
        }).catch((r) => console.error(
            `Night Light(hyprsunset): Couldn't set temperature. Stderr: ${r}`
        ));
    }

    private setGamma(value: number): void {
        if(value === this.gamma) return;

        if(value > this.maxGamma || value < 0) {
            console.error(`Night Light(hyprsunset): provided gamma ${value
                } is out of bounds (min: 0; max: ${this.maxTemperature})`);
            return;
        }

        execAsync(`hyprctl hyprsunset gamma ${value}`).then(() => {
            this.#gamma = value;
            this.notify("gamma");

            this.#identity = false;
            this.#prevTemperature = null;
            this.#prevGamma = null;
        }).catch((r) => console.error(
            `Night Light(hyprsunset): Couldn't set gamma. Stderr: ${r}`
        ));
    }

    public applyIdentity(): void {
        if(this.#identity) return;

        this.#prevGamma = this.#gamma;
        this.#prevTemperature = this.#temperature;

        this.#identity = true;
        this.temperature = this.identityTemperature;
        this.gamma = this.maxGamma;
    }

    public filter(): void {
        if(!this.#identity) return;

        this.#identity = false;
        this.setTemperature(this.#prevTemperature ?? this.identityTemperature);
        this.setGamma(this.#prevGamma ?? this.maxGamma);

        this.#prevTemperature = null;
        this.#prevGamma = null;
    }

    public saveData(): void {
        exec(`sh ${GLib.get_user_config_dir()}/hypr/scripts/save-hyprsunset.sh`);
    }

    public loadData(): void {
        exec(`sh ${GLib.get_user_config_dir()}/hypr/scripts/load-hyprsunset.sh`);
    }
}
