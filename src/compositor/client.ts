import { getter, gtype, register } from "ags/gobject";
import { Gdk } from "ags/gtk4";
import GObject from "gi://GObject?version=2.0";


/** @abstract */
@register({ GTypeName: "CompositorClient" })
class Client extends GObject.Object {
    readonly #address: string|null = null;
    #initialTitle: string = "";
    #initialClass: string = "";
    #class: string = "";
    #title: string = "";
    #mapped: boolean = true;
    #allocation: Client.Allocation|null = null;
    #xwayland: boolean = false;

    @getter(gtype<string|null>(String))
    get address() { return this.#address; }

    @getter(String)
    get title() { return this.#title; }

    @getter(String)
    get class() { return this.#class; }

    @getter(String)
    get initialTitle() { return this.#initialTitle; }

    @getter(String)
    get initialClass() { return this.#initialClass; }

    @getter(gtype<Client.Allocation|null>(Object))
    get allocation() { return this.#allocation; }

    @getter(Boolean)
    get xwayland() { return this.#xwayland; }

    @getter(Boolean)
    get mapped() { return this.#mapped; }

    constructor(props: Partial<Client.ConstructorProps> = {}) {
        super();

        if(props.class !== undefined)
            this.#class = props.class;

        if(props.title !== undefined)
            this.#title = props.title;

        if(props.mapped !== undefined)
            this.#mapped = props.mapped;

        if(props.address !== undefined)
            this.#address = props.address;

        if(props.allocation !== undefined)
            this.#allocation = props.allocation;

        if(props.initialTitle !== undefined)
            this.#initialTitle = props.initialTitle;

        if(props.initialClass !== undefined || props.class !== undefined)
            this.#initialClass = props.initialClass ?? props.class!;
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
            "initialTitle"
        ] satisfies Array<keyof this>)
            .map(k => `${" ".repeat(4)}"${k}": ${this[k]}`)
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
        initialClass: string;
        allocation: Gdk.Rectangle;
    }
}

export default Client;
