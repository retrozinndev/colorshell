import { execAsync } from "ags/process";
import { userData } from "../config";
import { getPID, killProc, watchInputStream } from "./utils";
import GObject, { getter, register, setter } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


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
    #proc: Gio.Subprocess|null = null;

    @getter(Number)
    public get temperature() { return this.#temperature; }
    @setter(Number)
    public set temperature(newValue: number) {
        if(newValue === this.#temperature)
            return;

        this.setTemperature(newValue);
    }

    @getter(Number)
    public get gamma() { return this.#gamma; }
    @setter(Number)
    public set gamma(newValue: number) {
        if(newValue === this.#gamma)
            return;
        this.setGamma(newValue);
    }

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

        const pid = getPID("hyprsunset");
        if(pid != null)
            killProc(pid);

        // this is problematic, since we don't want to only support hyprland...
        const instanceSig = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
        if(instanceSig === null || instanceSig.trim() === "") {
            console.error("Night Light: Failed to initialize socket: HYPRLAND_INSTANCE_SIGNATURE \
isn't set(are you running on Hyprland?)");
            return;
        }

        this.restartDaemon().then(() => setTimeout(() => {
            this.loadData();
        }, 800)).catch(e => {
            console.error("Night Light: Failed to initialize hyprsunset(is it installed?):", e);
        });
    }

    public static init(): NightLight {
        if(!this.instance)
            this.instance = new NightLight();

        return this.instance;
    }

    public static getDefault(): NightLight {
        return this.init();
    }

    public async quitDaemon(): Promise<boolean> {
        if(!this.#proc)
            return false;

        return new Promise((resolve, reject) => {
            this.#proc!.wait_async(null, (_, res) => {
                let result!: boolean;
                try {
                    result = this.#proc!.wait_finish(res);
                } catch(e) {
                    reject(e);
                    return;
                }

                resolve(result);
            });

            this.#proc!.force_exit();
        });
    }

    public async restartDaemon(): Promise<void> {
        if(this.#proc)
            await this.quitDaemon();

        this.#proc = Gio.Subprocess.new(
            [
                "hyprsunset",
                "-t",
                this.#temperature.toString(),
                "-g",
                this.#gamma.toString(),
                "--gamma_max",
                "200",
                `${this.#identity ? "-i" : ""}`
            ].filter(s => s.trim() !== ""),
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        const stream = this.#proc.get_stdout_pipe()!;
        setTimeout(() => { // delay because hyprsunset socket takes some time to show up
            watchInputStream(stream, (data) => { // will stop watching when input stream gets closed
                const temperatureExpr = /([0-9]*)K/;
                if(data.includes("temperature") && temperatureExpr.test(data)) {
                    const [, temp] = temperatureExpr.exec(data)!;
                    if(temp == null)
                        return;

                    this.#temperature = Number.parseInt(temp);
                    this.notify("temperature");
                }

                this.dispatchAsync("gamma").then((out) => {
                    this.#gamma = Number.parseInt(out);
                    this.notify("gamma");
                }).catch(console.error);
            });
        }, 500);
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
        this.dispatchAsync("identity").catch(console.error);

        if(!this.#identity) {
            this.#identity = true;
            this.notify("identity");
        }
    }

    private async dispatchAsync(call: "temperature", val?: number): Promise<string>;
    private async dispatchAsync(call: "gamma", val?: number): Promise<string>;
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

export default NightLight;
