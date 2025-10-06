import { CompositorHyprland } from "./hyprland";
import GObject, { getter, gtype, register } from "ags/gobject";

import GLib from "gi://GLib?version=2.0";

/** WIP modular implementation of a system that supports implementing
* a variety of Wayland Compositors 
* @todo implement more general compositor info + a lot of stuff
* */
export namespace Compositors {
    let compositor: Compositor|null = null;
    
    @register({ GTypeName: "CompositorMonitor" })
    export class Monitor extends GObject.Object {
        #width: number;
        #height: number;
        #scaling: number;

        @getter(Number)
        get width() { return this.#width; }

        @getter(Number)
        get height() { return this.#height; }

        @getter(Number)
        get scaling() { return this.#scaling; }

        constructor(width: number, height: number, scaling: number = 1) {
            super();

            this.#width = width;
            this.#height = height;
            this.#scaling = scaling;
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
            this.notify("monitor");
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

            if(props.initialClass !== undefined)
                this.#initialClass = props.initialClass;
            else 
                this.#initialClass = props.class;
        }
    }

    @register({ GTypeName: "Compositor" })
    export class Compositor extends GObject.Object {
        protected _workspaces: Array<Workspace> = [];
        protected _focusedClient: Client|null = null;

        @getter(Array<Workspace>)
        get workspaces() { return this._workspaces; }

        @getter(gtype<Client|null>(Client))
        get focusedClient() { return this._focusedClient; }

        constructor() {
            super();
        }
    };


    export function getDefault(): Compositor {
        if(!compositor)
            throw new Error("Compositors haven't been initialized correctly, please call `Compositors.init()` before calling any method in `Compositors`");

        return compositor;
    }


    /** Uses the XDG_CURRENT_DESKTOP variable to detect running compositor's name.
      * ---
      * @returns running wayland compositor's name (lowercase) or `undefined` if variable's not set */
    export function getName(): string|undefined {
        return GLib.getenv("XDG_CURRENT_DESKTOP")?.toLowerCase() ?? undefined;
    }

    /** initialize colorshell's wayland compositor implementation abstraction.
      * when called, and if it's implemented, sets the default compositor to an equivalent implementation for the current desktop(checks from XDG_CURRENT_DESKTOP) */
    export function init(): void {
        switch(Compositors.getName()) {
            case "hyprland":
                compositor = new CompositorHyprland();
            break;

            default:
                console.error(`This compositor(${Compositors.getName()}) is not yet implemented to colorshell. Please contribute by implementing it if you can! :)`);
        }
    }
}
