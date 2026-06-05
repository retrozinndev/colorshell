import GObject, { getter, gtype, register, signal } from "ags/gobject";
import Monitor from "./monitor";
import Client from "./client";
import Workspace from "./workspace";


    
/** WIP modular implementation of a system that supports implementing
* a variety of Wayland Compositors 
* @todo implement more general compositor properties + a lot of stuff
* @abstract
* @readonly
* */
@register({ GTypeName: "ClshCompositor" })
class Compositor extends GObject.Object {
    declare $signals: Compositor.SignalSignatures;
    public static instance: Compositor;

    protected _monitors: Array<Monitor> = [];
    protected _workspaces: Array<Workspace> = [];
    protected _clients: Array<Client> = []
    protected _focusedClient: Client|null = null;
    protected _focusedWorkspace: Workspace|null = null;

    @getter(Array)
    get monitors() { return this._monitors; }

    @getter(Array)
    get workspaces() { return this._workspaces; }

    @getter(Array)
    get clients() { return this._clients; }

    @getter(gtype<Client|null>(GObject.Object))
    get focusedClient() { return this._focusedClient; }

    @getter(gtype<Workspace|null>(GObject.Object))
    get focusedWorkspace() { return this._focusedWorkspace; }

    @signal(GObject.Object)
    clientAdded(_: Client) {}

    @signal(GObject.Object)
    clientRemoved(_: Client) {}

    @signal(GObject.Object)
    workspaceAdded(_: Workspace) {}

    @signal(GObject.Object)
    workspaceRemoved(_: Workspace) {}

    @signal(GObject.Object)
    monitorAdded(_: Monitor) {}

    @signal(GObject.Object)
    monitorRemoved(_: Monitor) {}

    constructor() {
        super();
    }
}

namespace Compositor {
    export interface ConstructorProps extends GObject.Object.ConstructorProps {}
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "client-added": (client: Client) => void;
        "client-removed": (client: Client) => void;
        "workspace-added": (workspace: Workspace) => void;
        "workspace-removed": (Workspace: Workspace) => void;
        "monitor-added": (monitor: Monitor) => void;
        "monitor-removed": (monitor: Monitor) => void;
    }
}

export default Compositor;
