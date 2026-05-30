import { Accessor } from "ags";
import { construct } from "../../../modules/utils";
import { gtype, property, register } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


/** allow accessors as property values */
type Accessorize<T extends object> = {
    [K in keyof T]: T[K]|Accessor<T[K]>
};

@register({ GTypeName: "OSDMode" })
class OSDMode extends GObject.Object {
    declare readonly $signals: OSDMode.SignalSignatures;
    declare readonly $readWriteProperties: OSDMode.ReadWriteProperties;
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

    constructor(props: Partial<
        Accessorize<GObject.ConstructorProps<OSDMode>>
    >) {
        super();
        this.#subs = construct(this, props);
    }

    destroy(): void {
        this.#subs.forEach(disconn => disconn());
    }
}

namespace OSDMode {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify::icon"(): void;
        "notify::value"(): void;
        "notify::max"(): void;
        "notify::text"(): void;
        "notify::available"(): void;
    }

    export interface ReadWriteProperties extends GObject.Object.SignalSignatures {
        "icon": string;
        "value": number;
        "max": number;
        "text": string|null;
        "available": boolean;
    }
}

export default OSDMode;
