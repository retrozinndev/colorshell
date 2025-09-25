import { createRoot, getScope, Scope } from "ags";
import GObject, { getter, gtype, register, setter } from "ags/gobject";
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
    
    @getter(gtype<AstalBluetooth.Adapter|null>(AstalBluetooth.Adapter))
    get adapter() { return this.#adapter; }

    @setter(gtype<AstalBluetooth.Adapter|null>(AstalBluetooth.Adapter))
    set adapter(newAdapter: AstalBluetooth.Adapter|null) {
        this.#adapter = newAdapter;
        this.notify("adapter");
    }

    constructor() {
        super();

        createRoot((_) => {
            this.#scope = getScope();
            
            this.#connections.set(
                AstalBluetooth.get_default(), 
                AstalBluetooth.get_default().connect("adapter-added", (self, adapter) => {
                    if(self.adapters.length === 1)  // adapter was just added
                        this.adapter = adapter;
                })
            );

            this.#connections.set(
                AstalBluetooth.get_default(),
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
            );
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
