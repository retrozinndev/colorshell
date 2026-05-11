import { getter, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import CompositorMonitor from "./monitor";


namespace Compositor {
    @register({ GTypeName: "CompositorWorkspace" })
    export class Workspace extends GObject.Object {
        #id: number;
        #monitor: CompositorMonitor.Monitor;

        @getter(Number)
        get id() { return this.#id; }

        @getter(GObject.Object)
        get monitor() { return this.#monitor; }

        constructor(monitor: CompositorMonitor.Monitor, id: number = 0) {
            super();

            this.#monitor = monitor;
            this.#id = id;
        }
    }
}

export default Compositor;
