import { exec, execAsync, GObject, monitorFile, readFileAsync, register, signal } from "astal";
import { Connectable } from "astal/binding";


/** !!TODO!! Needs more work and testing
 * I(retrozinndev) don't have a monitor that has software-controlled brightness :(
 */
@register({ GTypeName: "Brightness" })
class Brightness extends GObject.Object implements Connectable {
    private readonly backlight: string|undefined;
    private max: number;
    private brightness: number;

    @signal(Number)
    declare brightnessChanged: (value: number) => void;

    constructor(backlightDevice?: string) {
        super();
        this.backlight = backlightDevice || "intel_backlight";
        this.max = Number.parseInt(exec(`brightnessctl -d ${backlightDevice} max`))
        this.brightness = Number.parseInt(exec(`brightnessctl -d ${backlightDevice} get`))

        readFileAsync(`/sys/class/backlight/${backlightDevice}/brightness`).catch(() => {
            throw new Error(`Couldn't find backlight ${backlightDevice}`);
        });

        monitorFile(`/sys/class/backlight/${backlightDevice}/brightness`, async () => {
            this.brightness = Number.parseInt(await execAsync(`brightnessctl -d ${backlightDevice} get`));
            this.max = Number.parseInt(await execAsync(`brightnessctl -d ${backlightDevice} max`));

            this.emit("brightness-changed", this.brightness);
        });
    }

    public setBrightness(newBrightness: number): void {
        execAsync(`brightnessctl -d ${this.backlight} set ${newBrightness || this.brightness}`).catch(() => {
            throw new Error(`Couldn't set brightness of backlight ${this.backlight}`);
        });

        this.emit("brightness-changed", newBrightness);
    }
}
