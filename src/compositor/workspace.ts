import { getter, gtype, property, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import Monitor from "./monitor";
import Compositor from ".";


/** @abstract */
@register({ GTypeName: "CompositorWorkspace" })
class Workspace extends GObject.Object {
    declare readonly $readableProperties: Workspace.ReadableProperties;
    declare readonly $readWriteProperties: Workspace.ReadWriteProperties;
    declare readonly $constructOnlyProperties: Workspace.ConstructOnlyProperties;

    #id: number;
    #name: string|null = null;

    @getter(Number)
    get id() { return this.#id; }

    @getter(gtype<string|null>(String))
    get name() { return this.#name; }

    @property(GObject.Object)
    monitor: Monitor;

    constructor(props: Partial<GObject.ConstructorProps<Workspace>>) {
        super();

        if(!props.monitor)
            throw new Error("Monitor not set for workspace");

        this.monitor = props.monitor;
        this.#id = props.id ?? Compositor.getDefault().workspaces.sort((w1, w2) =>
            w1.id - w2.id
        ).at(-1)?.id ?? 0;

        if(props.name !== undefined)
            this.#name = props.name;
    }
}

namespace Workspace {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {}
    export interface ConstructOnlyProperties extends GObject.Object.ConstructOnlyProperties {
        id: number;
        name: string;
        monitor: Monitor;
    }
    export interface ReadableProperties extends GObject.Object.ReadableProperties {
        "id": number;
        "name": string|null;
    }
    export interface ReadWriteProperties extends GObject.Object.ReadWriteProperties {
        "monitor": Monitor;
    }
}

export default Workspace;
