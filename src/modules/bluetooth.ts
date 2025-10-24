import { createRoot, getScope, Scope } from "ags";
import { execAsync } from "ags/process";
import { userData } from "../config";
import GObject, { getter, gtype, property, register, setter } from "ags/gobject";

import AstalBluetooth from "gi://AstalBluetooth";
import { createScopedConnection } from "gnim-utils";


/** AstalBluetooth helper (implements the default adapter feature) */
@register({ GTypeName: "Bluetooth" })
export class Bluetooth extends GObject.Object {
    declare $signals: {
        "notify": () => void;
        "notify::adapter": (adapter: AstalBluetooth.Adapter|null) => void;
        "notify::is-available": (available: boolean) => void;
        "notify::save-default-adapter": (save: boolean) => void;
        "notify::last-device": (device: AstalBluetooth.Device|null) => void;
    };

    private static instance: Bluetooth;
    private astalBl = AstalBluetooth.get_default();

    #connections: Map<GObject.Object, Array<number>|number> = new Map();
    #adapter: AstalBluetooth.Adapter|null = this.astalBl.adapter ?? null;
    #scope!: Scope;
    #isAvailable: boolean = false;
    #lastDevice: AstalBluetooth.Device|null = null;

    @property(Boolean) 
    saveDefaultAdapter: boolean = true;

    @getter(Boolean)
    get isAvailable() { return this.#isAvailable; }

    /** last connected device, can be null */
    @getter(AstalBluetooth.Device)
    get lastDevice() { return this.#lastDevice!; }

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

        execAsync(`bluetoothctl select ${newAdapter.address}`).then(() => {
            userData.setProperty("bluetooth_default_adapter", newAdapter.address, true);
        }).catch(e => console.error(`Bluetooth: Couldn't select adapter. Stderr: ${e}`));
    }

    constructor() {
        super();

        createRoot(async () => {
            this.#scope = getScope();
            
            if(this.astalBl.adapters.length > 0) {
                this.#isAvailable = true;
                this.notify("is-available");
            }

            // load previous default adapter
            const dataDefaultAdapter = userData.getProperty("bluetooth_default_adapter", "string");
            const foundAdapter = this.astalBl.adapters.filter(a => a.address === dataDefaultAdapter)[0];

            if(dataDefaultAdapter !== undefined && foundAdapter !== undefined) 
                this.adapter = foundAdapter;

            createScopedConnection(AstalBluetooth.get_default(), "adapter-added", (adapter) => {
                if(this.astalBl.adapters.length === 1)  // adapter was just added
                    this.adapter = adapter;
            });
            createScopedConnection(AstalBluetooth.get_default(), "adapter-removed", (adapter) => {
                if(this.astalBl.adapters.length < 1) {
                    this.adapter = null;
                    this.#isAvailable = false;
                    this.notify("is-available");
                }

                if(this.#adapter?.address !== adapter.address) 
                    return;

                // the removed adapter was the default

                if(this.astalBl.adapters.length < 1) {
                    this.adapter = null;
                    this.#isAvailable = false;
                    this.notify("is-available");

                    return;
                }

                this.#adapter = this.astalBl.adapters[0];
          });
            
            // async to prevent slow start
            setTimeout(() => {
                this.#lastDevice = this.getLastConnectedDevice();
                this.notify("last-device");
            }, 1200);

            this.#connections.set(AstalBluetooth.get_default(), [
                AstalBluetooth.get_default().connect("device-added", (_) => {
                    this.#lastDevice = this.getLastConnectedDevice();
                    this.notify("last-device");
                }),
                AstalBluetooth.get_default().connect("device-removed", (_) => {
                    this.#lastDevice = this.getLastConnectedDevice();
                    this.notify("last-device");
                })
            ]);

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

    private getLastConnectedDevice(): AstalBluetooth.Device|null {
        
        const connectedDevices = AstalBluetooth.get_default().devices
            .filter(d => d.connected);

        const lastDevice = connectedDevices[connectedDevices.length - 1];

        return lastDevice ?? null;
    }

    connect<Signal extends keyof (typeof this)["$signals"]>(
        signal: Signal, callback: (typeof this["$signals"])[Signal]
    ): number {
        return super.connect(signal as string, callback as () => void);
    }
}
