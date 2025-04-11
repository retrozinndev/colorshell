import { GObject, property, register } from "astal";
import AstalHyprland from "gi://AstalHyprland?version=0.1";

export { NightLight };

@register({ GTypeName: "NightLight" })
class NightLight extends GObject.Object {
    private static instance: NightLight;

    #temperature: number = 4500;
    #gamma: number = 100;

    @property(Number)
    public get temperature() { return this.#temperature; }
    public set temperature(newValue: number) {
        if(newValue < 0) return;

        AstalHyprland.get_default().dispatch("hyprsunset", `temperature ${newValue}`);
        this.#temperature = newValue;
        this.notify("temperature");
    }

    @property(Number)
    public get gamma() { return this.#gamma; }
    public set gamma(newValue: number) {
        if(newValue < 0) return;

        AstalHyprland.get_default().dispatch("hyprsunset", `gamma ${newValue}`);
        this.#gamma = newValue;
        this.notify("gamma");
    }


    public static getDefault() {
        if(!this.instance)
            this.instance = new NightLight();

        return this.instance;
    }
}
