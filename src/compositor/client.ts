import { getter, gtype, register } from "ags/gobject";
import { Gdk } from "ags/gtk4";
import CompositorObject from "./object";
import GObject from "gi://GObject?version=2.0";
import Compositor from "./compositor";
import Workspace from "./workspace";


/** @abstract */
@register({ GTypeName: "CompositorClient" })
class Client extends CompositorObject {
    protected readonly _address: string|null = null;
    protected _initialTitle: string = "";
    protected _initialClass: string = "";
    protected _class: string = "";
    protected _title: string = "";
    protected _mapped: boolean = true;
    protected _allocation: Client.Allocation|null = null;
    protected _xwayland: boolean = false;
    protected _workspace: Workspace|null = null;
    

    @getter(gtype<string|null>(String))
    get address() { return this._address; }

    @getter(String)
    get title() { return this._title; }

    @getter(String)
    get class() { return this._class; }

    @getter(String)
    get initialTitle() { return this._initialTitle; }

    @getter(String)
    get initialClass() { return this._initialClass; }

    @getter(gtype<Client.Allocation|null>(Object))
    get allocation() { return this._allocation; }

    @getter(Boolean)
    get xwayland() { return this._xwayland; }

    @getter(gtype<Workspace|null>(GObject.Object))
    get workspace() { return this._workspace; }

    @getter(Boolean)
    get mapped() { return this._mapped; }

    constructor(compositor: Compositor, props: Partial<Client.ConstructorProps> = {}) {
        super(compositor);

        if(props.class !== undefined)
            this._class = props.class;

        if(props.title !== undefined)
            this._title = props.title;

        if(props.workspace !== undefined)
            this._workspace = props.workspace;

        if(props.mapped !== undefined)
            this._mapped = props.mapped;

        if(props.address !== undefined)
            this._address = props.address;

        if(props.allocation !== undefined)
            this._allocation = props.allocation;

        if(props.initialTitle !== undefined)
            this._initialTitle = props.initialTitle;

        if(props.initialClass !== undefined || props.class !== undefined)
            this._initialClass = props.initialClass ?? props.class!;
    }

    /** ask the client to quit / be closed */
    close(): void {}

    /** force-close the client */
    kill(): void {}

    /** grab focus to the client */
    focus(): void {}


    toString(): string {
        return `{\n${([
            "address",
            "class",
            "title",
            "allocation",
            "mapped",
            "xwayland",
            "initialClass",
            "workspace",
            "initialTitle"
        ] satisfies Array<keyof this>)
            .map(k => `${" ".repeat(4)}"${k}": ${String(this[k]).replace(/\n/g, `\n${" ".repeat(4)}`)}`)
            .join(",\n")
        }\n}`
    }
}

namespace Client {
    export class Allocation {
        public x: number = 0;
        public y: number = 0;
        public width: number = 0;
        public height: number = 0;

        constructor(props: Partial<{
            x: number,
            y: number,
            width: number,
            height: number
        }> = {}) {

            if(props.x !== undefined)
                this.x = props.x;

            if(props.y !== undefined)
                this.y = props.y;

            if(props.width !== undefined)
                this.width = props.width;

            if(props.height !== undefined)
                this.height = props.height;

        }

        toString(): string {
            return `{\n${([
                "x", "y", "width", "height"
            ] satisfies Array<keyof this>)
                .map(k => `${" ".repeat(4)}"${k}": ${this[k]}`)
                .join(",\n")
            }\n}`
        }
    }

    export interface SignalSignatures extends GObject.Object.SignalSignatures {}
    export interface ConstructorProps extends GObject.Object.ConstructorProps {
        address: string;
        title: string;
        mapped: boolean;
        class: string;
        initialTitle: string;
        workspace: Workspace;
        initialClass: string;
        allocation: Gdk.Rectangle;
    }
}

export default Client;
