import { getter, register, setter } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import CObject from "./object";
import Compositor from "./compositor";
import Gdk from "gi://Gdk?version=4.0";
import Gio from "gi://Gio?version=2.0"


/** @abstract */
@register({ GTypeName: "CompositorMonitor" })
class Monitor extends CObject {
    protected readonly _name: string;
    protected readonly _id: number;
    protected _modes: Array<string> = [];
    protected _mode: string;
    protected _scaling: number = 1.0;

    @getter(Number)
    get id() { return this._id; }

    /** the monitor's connector name (e.g.: HDMI-A-1) */
    @getter(String)
    get name() { return this._name; }

    @getter(Array)
    get modes() { return this._modes; }

    @getter(String)
    get mode() { return this._mode; }
    @setter(String)
    set mode(mode: string) {
        //if(!this._modes.includes(mode))
        //    throw new Error("Monitor mode is invalid/not available");

        this._mode = mode;
        this.notify("mode");
        this.notify("width");
        this.notify("height");
        this.notify("refresh-rate");
    }

    @getter(Number)
    get scaling() { return this._scaling; }
    @setter(Number)
    set scaling(scale: number) {
        this._scaling = scale;
        this.notify("scaling");
    }

    @getter(Number)
    get width() { return Monitor.stringToMode(this.mode)[0]; }

    @getter(Number)
    get height() { return Monitor.stringToMode(this.mode)[1]; }

    @getter(Number)
    get refreshRate() { return Monitor.stringToMode(this.mode)[2]; }

    constructor(
        compositor: Compositor, id: number, name: string, modes: Array<string>, mode: string, scaling: number = 1
    ) {
        super(compositor);

        this._id = id;
        this._name = name;
        this._modes = modes;

        //if(!modes.includes(mode))
        //    throw new Error("Monitor mode is invalid/not available");

        this._mode = mode;
        this.scaling = scaling;
    }

    /** convert conventional resolution data to a mode string (e.g. 1920x1080\@60 */
    public static modeToString(width: number, height: number, hz: number): string {
        return `${width}x${height}@${hz}`;
    }

    /** convert a mode string to [width, height, refreshRate] */
    public static stringToMode(modeString: string): [number, number, number] {
        const regex = /^([0-9]*)x([0-9]*)@([0-9]*)$/;
        if(!regex.test(modeString))
            throw new Error("Invalid Monitor mode string format. Try: WIDTHxHEIGHT@HZ (e.g.: 1920x1080@60)");

        return regex.exec(modeString)!.splice(1, 3) as unknown as [number, number, number];
    }

    /** get the equivalent GdkMonitor for this monitor. can be null */
    public getGMonitor(): Gdk.Monitor|null {
        const monitors = Gdk.Display.get_default()!.get_monitors() as Gio.ListModel<Gdk.Monitor>;

        for(let i = 0; i < monitors.get_n_items(); i++) {
            const gmonitor = monitors.get_item(i)!;

            if(gmonitor.get_connector()! === this.name)
                return gmonitor;
        }

        return null;
    }

    toString(): string {
        return `\
{
${([
    "id", "name", "modes", "mode"
] satisfies Array<keyof Monitor>)
    .map(k =>
         ' '.repeat(4) + `\"${k}\": ${String(this[k]).replace(/\n/g, `$&${' '.repeat(4)}`)}`
    )
    .join(",\n")
}
}`;
    }
}

namespace Monitor {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {}
    export interface ConstructorProps extends GObject.Object.ConstructorProps {}
}

export default Monitor;
