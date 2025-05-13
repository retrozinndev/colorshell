import { AstalIO, execAsync, GObject, interval, property, register } from "astal";

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

    @property(Number)
    public get temperature() { return this.#temperature; }
    public set temperature(newValue: number) { this.setTemperature(newValue); }

    @property(Number)
    public get gamma() { return this.#gamma; }
    public set gamma(newValue: number) { this.setGamma(newValue); }

    @property(Number)
    public get maxTemperature() { return 20000; }

    @property(Number)
    public get maxGamma() { return 100; }

    @property(Boolean)
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

    private async setTemperature(value: number): Promise<void> {
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

    private async setGamma(value: number) {
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

    private applyIdentity(): void {
        if(this.#identity) return;

        this.#prevGamma = this.#gamma;
        this.#prevTemperature = this.#temperature;

        this.#identity = true;
        this.temperature = 6000;
        this.gamma = this.maxGamma;
    }

    public filter(): void {
        if(!this.#identity) return;

        this.#identity = false;
        this.setTemperature(this.#prevTemperature ?? 1000);
        this.setGamma(this.#prevGamma ?? 100);

        this.#prevTemperature = null;
        this.#prevGamma = null;
    }
}
