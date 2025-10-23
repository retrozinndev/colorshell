import { Accessor } from "ags";
import { construct } from "../../../modules/utils";
import GObject, { gtype, property, register } from "ags/gobject";


@register({ GTypeName: "OSDMode" })
export default class OSDMode extends GObject.Object {
    readonly #subs: Array<() => void> = [];

    @property(String)
    icon: string = "image-missing";

    @property(Number)
    value: number = 0;

    @property(Number)
    max: number = 100;

    @property(gtype<string|null>(String))
    text: string|null = null;

    @property(Boolean)
    available: boolean = true;

    constructor(props: {
        icon: string | Accessor<string>;
        value: number | Accessor<number>;
        max?: number | Accessor<number>;
        text?: string | Accessor<string>;
        available?: boolean | Accessor<boolean>;
    }) {
        super();
        this.#subs = construct(this, props);
    }

    vfunc_dispose(): void {
        this.#subs.forEach(s => s());
    }
}
