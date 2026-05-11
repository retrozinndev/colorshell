import { getter, property, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


namespace Compositor {
    @register({ GTypeName: "CompositorMonitor" })
    export class Monitor extends GObject.Object {
        #width: number;
        #height: number;

        @getter(Number)
        get width() { return this.#width; }

        @getter(Number)
        get height() { return this.#height; }

        @property(Number)
        scaling: number;

        constructor(width: number, height: number, scaling: number = 1) {
            super();

            this.#width = width;
            this.#height = height;
            this.scaling = scaling;
        }
    }
}

export default Compositor;
