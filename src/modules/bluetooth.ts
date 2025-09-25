import { createRoot, getScope, Scope } from "ags";
import GObject, { getter, gtype, property, register, setter } from "ags/gobject";
import { execAsync } from "ags/process";

import AstalBluetooth from "gi://AstalBluetooth";


/** AstalBluetooth helper (implements the default adapter feature) */
@register({ GTypeName: "Bluetooth" })
export class Bluetooth extends GObject.Object {
    private static instance: Bluetooth;
    private astalBl = AstalBluetooth.get_default();

    #connections: Map<GObject.Object, Array<number>|number> = new Map();
    #adapter: AstalBluetooth.Adapter|null = this.astalBl.adapter ?? null;
    #scope!: Scope;
    #isAvailable: boolean = false;

    @getter(Boolean)
    get isAvailable() { return this.#isAvailable; }

    @property(Boolean) saveDefaultAdapter = true;
    
    @getter(gtype<AstalBluetooth.Adapter|null>(AstalBluetooth.Adapter))
    get adapter() { return this.#adapter; }

    @setter(gtype<AstalBluetooth.Adapter|null>(AstalBluetooth.Adapter))
    set adapter(newAdapter: AstalBluetooth.Adapter|null) {
        this.#adapter = newAdapter;
        this.notify("adapter");
        
        if(!newAdapter) return;

        AstalBluetooth.get_default().adapters.filter(ad => {
            if(ad.address !== newAdapter.address)
                return true;

            ad.set_powered(true);
            return false;
        }).forEach(ad => ad.set_powered(false));

        execAsync(`bluetoothctl select ${newAdapter.address}`).catch(e =>
            console.error(`Bluetooth: Couldn't select adapter. Stderr: ${e}`));
    }

    constructor() {
        super();

        createRoot((_) => {
            this.#scope = getScope();
            
            if(this.astalBl.adapters.length > 0) {
                this.#isAvailable = true;
                this.notify("is-available");
            }

            this.#connections.set(
                AstalBluetooth.get_default(), [
                    AstalBluetooth.get_default().connect("adapter-added", (self, adapter) => {
                        if(self.adapters.length === 1)  // adapter was just added
                            this.adapter = adapter;
                    }),
                    AstalBluetooth.get_default().connect("adapter-removed", (self, adapter) => {
                        if(self.adapters.length < 1) {
                            this.adapter = null;
                            this.#isAvailable = false;
                            this.notify("is-available");
                        }

                        if(this.#adapter?.address !== adapter.address) 
                            return;

                        // the removed adapter was the default

                        if(self.adapters.length < 1) {
                            this.adapter = null;
                            this.#isAvailable = false;
                            this.notify("is-available");

                            return;
                        }

                        this.#adapter = self.adapters[0];
                    })
                ]
            );

            this.#scope.onCleanup(() => this.#connections.forEach((ids, gobj) => 
                Array.isArray(ids) ? 
                    ids.forEach(id => gobj.disconnect(id))
                : gobj.disconnect(ids)
            ));
        });
    }

    public static getDefault(): Bluetooth {
        if(!this.instance)
            this.instance = new Bluetooth();

        return this.instance;
    }

    vfunc_dispose(): void {
        this.#scope.dispose();
    }
}
