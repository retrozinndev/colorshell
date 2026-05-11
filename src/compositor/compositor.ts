import GObject, { getter, gtype, register, signal } from "ags/gobject";
import CompositorMonitor from "./monitor";
import CompositorClient from "./client";
import CompositorWorkspace from "./workspace";


namespace Compositor {
    let instance: Compositor.Compositor|null = null;
    
    /** WIP modular implementation of a system that supports implementing
    * a variety of Wayland Compositors 
    * @todo implement more general compositor properties + a lot of stuff
    * */
    @register({ GTypeName: "ClshCompositor" })
    export class Compositor extends GObject.Object {
        declare $signals: Compositor.SignalSignatures;
        public static instance: Compositor;

        protected _monitors: Array<CompositorMonitor.Monitor> = [];
        protected _workspaces: Array<CompositorWorkspace.Workspace> = [];
        protected _clients: Array<CompositorClient.Client> = []
        protected _focusedClient: CompositorClient.Client|null = null;

        @getter(Array)
        get monitors() { return this._monitors; }

        @getter(Array)
        get workspaces() { return this._workspaces; }

        @getter(Array)
        get clients() { return this._clients; }

        @getter(gtype<CompositorClient.Client|null>(GObject.Object))
        get focusedClient() { return this._focusedClient; }

        @signal(GObject.Object)
        clientAdded(_: CompositorClient.Client) {}

        @signal(GObject.Object)
        clientRemoved(_: CompositorClient.Client) {}

        @signal(GObject.Object)
        workspaceAdded(_: CompositorWorkspace.Workspace) {}

        @signal(GObject.Object)
        workspaceRemoved(_: CompositorWorkspace.Workspace) {}

        @signal(GObject.Object)
        monitorAdded(_: CompositorMonitor.Monitor) {}

        @signal(GObject.Object)
        monitorRemoved(_: CompositorMonitor.Monitor) {}

        constructor() {
            super();
        }
    }

    /** set the `Compositor` implementation(only if not set already) */
    export function setDefault(impl: Compositor.Compositor) {
        if(instance !== null)
            throw new Error("Couldn't set default Compositor implementation: already set");

        instance = impl;
    }

    /** get the default `Compositor` implementation */
    export function getDefault(): Compositor {
        return instance!;
    }

    export interface ConstructorProps extends GObject.Object.ConstructorProps {}
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "client-added": (client: CompositorClient.Client) => void;
        "client-removed": (client: CompositorClient.Client) => void;
        "workspace-added": (workspace: CompositorWorkspace.Workspace) => void;
        "workspace-removed": (Workspace: CompositorWorkspace.Workspace) => void;
        "monitor-added": (monitor: CompositorMonitor.Monitor) => void;
        "monitor-removed": (monitor: CompositorMonitor.Monitor) => void;
    }
}

export default Compositor;
