import { createRoot, getScope, Scope } from "ags";
import { execAsync } from "ags/process";
import { userData } from "../config";
import { createScopedConnection } from "../modules/utils";
import GObject, { getter, gtype, property, register, setter } from "ags/gobject";

import AstalBluetooth from "gi://AstalBluetooth";


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
    private astalBl: AstalBluetooth.Bluetooth;

    #adapter: AstalBluetooth.Adapter|null = null;
    #scope!: Scope;
    #isAvailable: boolean = false;
    #lastDevice: AstalBluetooth.Device|null = null;

    @property(Boolean) 
    saveDefaultAdapter: boolean = true;

    @getter(Boolean)
    get isAvailable() { return this.#isAvailable; }

    /** last connected device, can be null */
    @getter(gtype<AstalBluetooth.Device|null>(AstalBluetooth.Device))
    get lastDevice() { return this.#lastDevice; }

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
        
        this.astalBl = AstalBluetooth.get_default();
        this.#adapter = this.astalBl.adapter ?? null;

        if(this.astalBl.adapters.length > 0) {
            this.#isAvailable = true;
            this.notify("is-available");
        }

        createRoot(() => {
            this.#scope = getScope();           

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
            
            this.#lastDevice = this.getLastConnectedDevice();
            this.notify("last-device");

            const deviceConns: Map<string, number> = new Map();

            this.astalBl.devices.forEach((dev) => {
                deviceConns.set(dev.address, dev.connect("notify::connected", () => {
                    this.#lastDevice = this.getLastConnectedDevice();
                    this.notify("last-device");
                }));
            });

            createScopedConnection(
                AstalBluetooth.get_default(), "device-added", (dev) => {
                    deviceConns.set(dev.address, dev.connect("notify::connected", () => {
                        this.#lastDevice = this.getLastConnectedDevice();
                        this.notify("last-device");
                    }));
                }
            );

            createScopedConnection(
                AstalBluetooth.get_default(), "device-removed", (dev) => {
                    const id = deviceConns.get(dev.address);
                    if(id !== undefined)
                        dev.disconnect(id);

                    this.#lastDevice = this.getLastConnectedDevice();
                    this.notify("last-device");
                }
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

    private getLastConnectedDevice(): AstalBluetooth.Device|null {
        const devices = AstalBluetooth.get_default().devices
            .filter(d => d.paired && d.trusted && d.connected);

        const lastDevice = devices[devices.length - 1];

        return lastDevice ?? null;
    }

    connect<Signal extends keyof (typeof this)["$signals"]>(
        signal: Signal, callback: (typeof this["$signals"])[Signal]
    ): number {
        return super.connect(signal as string, callback as () => void);
    }
}
