import GObject, { getter, gtype, property, register, signal } from "ags/gobject";


/** WIP modular implementation of a system that supports implementing
* a variety of Wayland Compositors 
* @todo implement more general compositor properties + a lot of stuff
* */
@register({ GTypeName: "Compositor" })
export class Compositor extends GObject.Object {
    declare $signals: Compositor.SignalSignatures;
    public static instance: Compositor;

    protected _monitors: Array<Compositor.Monitor> = [];
    protected _workspaces: Array<Compositor.Workspace> = [];
    protected _clients: Array<Compositor.Client> = []
    protected _focusedClient: Compositor.Client|null = null;

    @getter(Array)
    get monitors() { return this._monitors; }

    @getter(Array)
    get workspaces() { return this._workspaces; }

    @getter(Array)
    get clients() { return this._clients; }

    @getter(gtype<Compositor.Client|null>(GObject.Object))
    get focusedClient() { return this._focusedClient; }

    @signal(GObject.Object)
    clientAdded(_: Compositor.Client) {}

    @signal(GObject.Object)
    clientRemoved(_: Compositor.Client) {}

    @signal(GObject.Object)
    workspaceAdded(_: Compositor.Workspace) {}

    @signal(GObject.Object)
    workspaceRemoved(_: Compositor.Workspace) {}

    @signal(GObject.Object)
    monitorAdded(_: Compositor.Monitor) {}

    @signal(GObject.Object)
    monitorRemoved(_: Compositor.Monitor) {}

    constructor() {
        super();
    }

    public static getDefault(): Compositor {
        return this.instance;
    }

    connect<S extends keyof Compositor.SignalSignatures>(
        signal: S,
        callback: (self: Compositor, ...params: Parameters<Compositor.SignalSignatures[S]>) => ReturnType<Compositor.SignalSignatures[S]>
    ): number {
        return super.connect(signal, callback);
    }
};

export namespace Compositor {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "client-added": (client: Compositor.Client) => void;
        "client-removed": (client: Compositor.Client) => void;
        "workspace-added": (workspace: Compositor.Workspace) => void;
        "workspace-removed": (Workspace: Compositor.Workspace) => void;
        "monitor-added": (monitor: Compositor.Monitor) => void;
        "monitor-removed": (monitor: Compositor.Monitor) => void;
    }

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

    @register({ GTypeName: "CompositorWorkspace" })
    export class Workspace extends GObject.Object {
        #id: number;
        #monitor: Monitor;

        @getter(Number)
        get id() { return this.#id; }

        @getter(Monitor)
        get monitor() { return this.#monitor; }

        constructor(monitor: Monitor, id: number = 0) {
            super();

            this.#monitor = monitor;
            this.#id = id;
        }
    }

    @register({ GTypeName: "CompositorClient" })
    export class Client extends GObject.Object {
        readonly #address: string|null = null;
        #initialClass: string;
        #class: string;
        #title: string = "";
        #mapped: boolean = true;
        #position: [number, number] = [0, 0];
        #xwayland: boolean = false;

        @getter(gtype<string|null>(String))
        get address() { return this.#address; }

        @getter(String)
        get title() { return this.#title; }

        @getter(String)
        get class() { return this.#class; }

        @getter(String)
        get initialClass() { return this.#initialClass; }

        @getter(gtype<[number, number]>(Array))
        get position() { return this.#position; }

        @getter(Boolean)
        get xwayland() { return this.#xwayland; }

        @getter(Boolean)
        get mapped() { return this.#mapped; }

        constructor(props: {
            address?: string;
            title?: string;
            mapped?: boolean;
            class: string;
            initialClass?: string;
            /** [x, y] */
            position?: [number, number];
        }) {
            super();

            this.#class = props.class;

            if(props.title !== undefined)
                this.#title = props.title;

            if(props.mapped !== undefined)
                this.#mapped = props.mapped;

            if(props.address !== undefined)
                this.#address = props.address;

            if(props.position !== undefined)
                this.#position = props.position;

            this.#initialClass = props.initialClass !== undefined ?
                props.initialClass
            : props.class;
        }
    }
}
