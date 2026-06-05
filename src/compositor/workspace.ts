import { getter, gtype, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import Client from "./client";
import CObject from "./object";
import Compositor from "./compositor";


/** @abstract */
@register({ GTypeName: "CompositorWorkspace" })
class Workspace extends CObject {
    protected readonly _id: number;
    protected _name: string|null = null;
    protected _clients: Array<Client> = [];
    protected _lastFocusedClient: Client|null = null;

    @getter(Number)
    get id() { return this._id; }

    @getter(gtype<string|null>(String))
    get name() { return this._name; }

    @getter(Array)
    get clients() { return this._clients; }

    @getter(gtype<Client|null>(GObject.Object))
    get lastFocusedClient() { return this._lastFocusedClient; }


    constructor(compositor: Compositor, props: Workspace.ConstructorProps) {
        super(compositor);

        this._id = props.id;

        if(props.name !== undefined)
            this._name = props.name;

        if(props.clients !== undefined && props.clients.length > 0)
            this._clients.push(...props.clients);

        if(props.lastFocusedClient !== undefined)
            this._lastFocusedClient = props.lastFocusedClient;
    }

    /** focus this workspace (change focused monitor focus to this workspace) */
    focus(): void {}

    toString(): string {
        return `\
{
${([
    "id", "name", "clients", "lastFocusedClient"
] satisfies Array<keyof Workspace>)
    .map(k =>
        `${" ".repeat(4)}"${k}": ${
            Array.isArray(this[k]) ? 
                `[${String(this[k]).replace(/\n/g, `$&${" ".repeat(4)}`)}]`
            : String(this[k]).replace(/\n/g, `$&${" ".repeat(4)}`)
        }`
    )
    .join(",\n")
}
}`;
    }
}

namespace Workspace {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {}
    export interface ConstructorProps extends GObject.Object.ConstructorProps {
        id: number;
        name?: string;
        clients?: Array<Client>;
        lastFocusedClient?: Client;
    }
}

export default Workspace;
