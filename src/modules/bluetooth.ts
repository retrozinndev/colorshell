import { execAsync } from "ags/process";
import { userData } from "../config";
import GObject, { getter, gtype, property, register, setter } from "ags/gobject";
import AstalBluetooth from "gi://AstalBluetooth";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";

Gio._promisify(AstalBluetooth.Device.prototype, "connect_device", "connect_device_finish");

/** AstalBluetooth helper (implements the default adapter feature) */
@register({ GTypeName: "Bluetooth" })
class Bluetooth extends GObject.Object {
    declare $signals: Bluetooth.SignalSignatures;

    private static instance: Bluetooth;
    private astalBl: AstalBluetooth.Bluetooth;

    #adapter: AstalBluetooth.Adapter|null = null;
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

        // load previous default adapter
        const dataDefaultAdapter = userData.getProperty("bluetooth_default_adapter", "string");
        const foundAdapter = this.astalBl.adapters.filter(a => a.address === dataDefaultAdapter)[0];

        if(dataDefaultAdapter !== undefined && foundAdapter !== undefined) 
            this.adapter = foundAdapter;

        AstalBluetooth.get_default().connect("adapter-added", (_, adapter) => {
            if(this.astalBl.adapters.length === 1)  // adapter was just added
                this.adapter = adapter;
        });

        AstalBluetooth.get_default().connect("adapter-removed", (_, adapter) => {
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

        AstalBluetooth.get_default().connect("device-added", (_, dev) => {
            deviceConns.set(dev.address, dev.connect("notify::connected", () => {
                this.#lastDevice = this.getLastConnectedDevice();
                this.notify("last-device");
            }));
        });

        AstalBluetooth.get_default().connect("device-removed", (_, dev) => {
            const id = deviceConns.get(dev.address);
            if(id !== undefined)
                dev.disconnect(id);

            this.#lastDevice = this.getLastConnectedDevice();
            this.notify("last-device");
        });
    }

    public static getDefault(): Bluetooth {
        if(!this.instance)
            this.instance = new Bluetooth();

        return this.instance;
    }

    private getLastConnectedDevice(): AstalBluetooth.Device|null {
        const devices = AstalBluetooth.get_default().devices
            .filter(d => d.paired && d.trusted && d.connected);

        const lastDevice = devices[devices.length - 1];

        return lastDevice ?? null;
    }

    
    async pairDevice(device: AstalBluetooth.Device): Promise<void> {
        if(device.paired)
            return;

        return new Promise((resolve, reject) => {
            GLib.idle_add(GLib.PRIORITY_LOW, () => {
                try {
                    device.pair();
                    resolve();
                } catch(e) {
                    reject(e);
                }

                return GLib.SOURCE_REMOVE;
            });
        });
    }

    async connectDevice(device: AstalBluetooth.Device): Promise<void> {
        if(device.connected)
            return;

        return await device.connect_device();
    }
}

namespace Bluetooth {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify": () => void;
        "notify::adapter": () => void;
        "notify::is-available": () => void;
        "notify::save-default-adapter": () => void;
        "notify::last-device": () => void;
    }
}

export default Bluetooth;
