import { getter, gtype, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


namespace Compositor {
    @register({ GTypeName: "CompositorClient" })
    export class Client extends GObject.Object {
        readonly #address: string|null = null;
        #initialClass: string;
        #class: string;
        #title: string = "";
        #mapped: boolean = true;
        #position: [number, number] = [0, 0];
        #size: [number, number] = [1, 1];
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

        @getter(Array)
        get size() { return this.#size; }

        constructor(props: {
            address?: string;
            title?: string;
            mapped?: boolean;
            class: string;
            initialClass?: string;
            /** [x, y] */
            position?: [number, number];
            /** [width, height] */
            size?: [number, number];
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

            if(props.size !== undefined)
                this.#size = props.size;

            this.#initialClass = props.initialClass !== undefined ?
                props.initialClass
            : props.class;
        }
    }
}

export default Compositor;
