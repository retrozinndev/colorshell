import { getter, property, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


/** @abstract */
@register({ GTypeName: "CompositorMonitor" })
class Monitor extends GObject.Object {
    declare $signals: Monitor.SignalSignatures;
    declare $readableProperties: Monitor.ReadableProperties;
    #mode: string;
    #modes: Array<string> = [];

    @getter(String)
    get mode() { return this.#mode; }

    @getter(Array)
    get modes() { return this.#modes; }

    @property(Number)
    scaling: number;

    constructor(modes: Array<string>, mode: string = modes[0], scaling: number = 1) {
        super();

        this.#modes = modes;
        this.#mode = mode;
        this.scaling = scaling;
    }
}

namespace Monitor {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {}
    export interface ReadableProperties extends GObject.Object.ReadableProperties {
        "mode": string;
        "modes": Array<string>;
    }
    export interface ReadWriteProperties extends GObject.Object.ReadWriteProperties {
        "scaling": number;
    }
}

export default Monitor;
