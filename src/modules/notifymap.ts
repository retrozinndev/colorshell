import { Accessor } from "ags";
import { getter, gtype, register, signal } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";


@register({ GTypeName: "ClshNotifiableMap" })
class NotifiableMap<K extends string|symbol|number = string, V = any> extends GObject.Object {
    declare readonly $signals: NotifiableMap.SignalSignatures<K, V>;
    declare readonly $readableProperties: NotifiableMap.ReadableProperties<K, V>;

    #map: Map<K, V> = new Map();

    @getter(Map)
    get map() { return this.#map; }

    @signal(gtype<K>(Object), gtype<V>(Object))
    added(_: K, __: V) {}

    @signal(Map)
    replaced(_: Map<K, V>) {}

    @signal(gtype<K>(Object))
    removed(_: K) {}

    constructor(items?: Array<[K, V]>) {
        super();
        if(items !== undefined) {
            items.forEach(pair => this.#map.set(pair[0], pair[1]));
            this.notify("map");
        }
    }


    getMap(): Map<K, V> {
        return this.#map;
    }

    add(key: K, value: V): void {
        const replaced = this.#map.has(key);
        this.#map.set(key, value);
        replaced ?
            (this as NotifiableMap).emit("replaced", this.#map as never)
        : (this as NotifiableMap).emit("added", key as never, value as never);
        
        this.notify("map");
    }

    has(key: K): boolean {
        return this.#map.has(key);
    }

    remove(key: K): boolean {
        const ok = this.#map.delete(key);
        ok && (this as NotifiableMap).emit("removed", key as never);
        this.notify("map");

        return ok;
    }

    sub(): Accessor<Map<K, V>>;
    sub<T>(transform: (value: Map<K, V>) => T): Accessor<T>;

    sub(transform?: <T>(value: Map<K, V>) => T): Accessor<Map<K, V>>|unknown {
        const accessor = new Accessor(this.getMap, (notify) => {
            const id = (this as NotifiableMap).connect("notify::map", () => notify());

            return () => {
                if(GObject.signal_handler_is_connected(this, id))
                    this.disconnect(id);
            };
        });

        return transform !== undefined ? accessor(transform) : accessor;
    }
}

namespace NotifiableMap {
    export interface SignalSignatures<K extends string|symbol|number, V>
        extends GObject.Object.SignalSignatures {

        "notify::map"(): void;

        "added"(key: K, value: V): void;
        "replaced"(map: Map<K, V>): void;
        "removed"(key: K): void;
    }

    export interface ReadableProperties<K extends string|symbol|number = string, V = any>
        extends GObject.Object.ReadableProperties {

        "map": Map<K, V>;
    }
}

export default NotifiableMap;
