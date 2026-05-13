import { getter, gtype, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import Monitor from "./monitor";


/** @abstract */
@register({ GTypeName: "CompositorWorkspace" })
class Workspace extends GObject.Object {
    #id: number;
    #name: string|null = null;
    #monitor: Monitor;

    @getter(Number)
    get id() { return this.#id; }

    @getter(gtype<string|null>(String))
    get name() { return this.#name; }

    @getter(GObject.Object)
    get monitor() { return this.#monitor; }

    constructor(props: Workspace.ConstructorProps) {
        super();

        this.#monitor = props.monitor;
        this.#id = props.id;

        if(props.name !== undefined)
            this.#name = props.name;
    }
}

namespace Workspace {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {}
    export interface ConstructorProps extends GObject.Object.ConstructorProps {
        id: number;
        monitor: Monitor;
        name?: string;
    }
}

export default Workspace;
