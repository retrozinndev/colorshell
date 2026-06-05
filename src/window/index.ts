import { Astal, Gdk } from "ags/gtk4";
import GObject, { getter, register, signal } from "ags/gobject";
import { createRoot, getScope, Scope } from "ags";
import Compositor from "../compositor";
import { shellWindows } from "../windows";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";


/** Manage shell windows and in which monitors they appear.
  *
  * Also contains util functions to create multi-monitor and 
  * focused-monitor-only windows */
@register({ GTypeName: "Windows" })
class Windows<T extends string = string> extends GObject.Object {
    declare $signals: Windows.SignalSignatures

    private static instance: (Windows | null);
    #windows: Record<string, Windows.Window> = {};

    @signal(String) windowOpen(_: string) {}
    @signal(String) windowClosed(_: string) {}

    @getter(Object)
    get windows() { return this.#windows; }

    @getter(Array)
    get openWindows(): Array<string> {
        return Object.keys(this.#windows).filter((key) => 
            this.#windows[key].status === Windows.Status.OPEN
        );
    }

    constructor() {
        super();

        const monitors = Gdk.Display.get_default()?.get_monitors() as Gio.ListModel<Gdk.Monitor>|undefined;
        if(!monitors)
            throw new Error("Windows: Couldn't get GdkDisplay for the window/widget management system!!");

        if(monitors.get_n_items() < 1)
            console.warn("Windows: There are no monitors/displays plugged in for colorshell to open the widgets. You might have to manually open them after plugging in a monitor to your system");

        monitors.connect("items-changed", (
            _: Gio.ListModel<Gdk.Monitor>,
            _pos: number,
            nRemoved: number,
            nAdded: number
        ) => {
            const nMonitors = monitors.get_n_items();

            // handle monitor removed
            if(nRemoved > 0) {
                if(nMonitors < 1) {
                    const windowList = [...this.openWindows]; // save window list
                    this.closeAll();
                    // wait for a monitor to be connected, so we can bring all of the previous windows back
                    const id = monitors.connect("items-changed", (_, __, ___, nAdded: number) => {
                        if(nAdded < 1)
                            return;

                        monitors.disconnect(id);
                        windowList.forEach(name => this.open(name as T));
                    });

                    return;
                }

                this.reopen();
                return;
            }

            if(nAdded > 0)
                this.reopen();
        });

    }

    /** disconnect multiple `connections`(a list of connection ids from `instance`) of a GObject instance */
    private _disconnectObject(instance: GObject.Object, connections: Array<number>): void {
        for(const id of connections) {
            if(GObject.signal_handler_is_connected(instance, id))
                instance.disconnect(id);
        }
    }

    private hasConnections(name: T): boolean;
    private hasConnections(name: string): boolean;
    private hasConnections(name: T|string): boolean {
        if(!this.openWindows.includes(name))
            return false;

        const window = this.#windows[name as T].data;
        if(!window)
            return false;

        if(Array.isArray(window)) {
            for(const win of window) {
                if(win.connections?.length > 0) 
                    return true;
            }

            return false;
        }

        return window.connections?.length > 0;
    }

    private disconnectWindow(name: T|string): void {
        const data = this.windows[name as T]?.data;

        if(!data)
            return;

        if(Array.isArray(data)) {
            for(const window of data)
                this._disconnectObject(window.instance, window.connections);

            return;
        }

        this._disconnectObject(data.instance, data.connections);
    }

    private connectWindow(name: T|string) {
        const window = this.#windows[name as T];
        if(this.hasConnections(name) || !window?.data)
            return;

        const onCloseRequest = (name: string, window: Windows.Window, data: Windows.Data): void => {
            this.disconnectWindow(name);
            // @ts-ignore
            delete data.instance;
            window.status = Windows.Status.CLOSED;
            this.notify("open-windows");
        };

        const data = window.data;
        if(Array.isArray(data)) {
            data.forEach(data => data.connections = [
                data.instance.connect("close-request", () => 
                    onCloseRequest(name, window, data)
                )
            ]);

            return;
        }

        data.connections = [
            data.instance.connect("close-request", () =>
                onCloseRequest(name, window, data)
            )
        ];
    }

    public static getDefault(): Windows<keyof typeof shellWindows> {
        if(!this.instance)
            this.instance = new Windows();

        return this.instance;
    }

    /**
     * Creates a window instance for every monitor connected
     * @param create generates the window. use provided monitor number in the returned window
     * @returns a function that when called, returns Array<Astal.Window>
     * @throws Error if there are no monitors connected
     */
    public static forMonitors(create: (mon: number, scope: Scope) => JSX.Element|Astal.Window): (() => Array<Astal.Window>) {
        // create a scope for every window generator function and dispose on ::close-request
        return () => {
            const monitors = Compositor.getDefault().monitors;

            if(monitors.length < 1) 
                throw new Error("Couldn't create window for monitors", {
                    cause: "No monitors connected on Hyprland"
                });

            return monitors.map(mon => {
                return createRoot((dispose) => {
                    const scope = getScope();
                    const instance = create(mon.id, scope) as Astal.Window;
                    const app = Adw.Application.get_default();
                    const id = instance.connect("close-request", () => dispose());

                    try {
                        instance.set_gdkmonitor(mon.getGMonitor()!);
                    } catch(_) {
                        instance.set_monitor(mon.id);
                    }

                    instance.set_application(app as Adw.Application);

                    scope.onCleanup(() => GObject.signal_handler_is_connected(instance, id) &&
                        instance.disconnect(id)
                    );

                    return instance;
                })
            })
        }
    }

    /**
     * Creates a window instance for focused monitor only
     * @param create generates the window. use provided monitor number in the returned window
     * @returns a function that when called, returns a Astal.Window instance
     * @throws Error if no focused monitor is found
     */
    public static forFocusedMonitor(create: (mon: number, scope: ReturnType<typeof getScope>) => GObject.Object|Astal.Window): (() => Astal.Window) {
        return () => {
            const focusedMonitor = this.getFocusedMonitorId();

            if(focusedMonitor == null) 
                throw new Error("Couldn't create window for focused monitor", { 
                    cause: `No focused monitor found (${typeof focusedMonitor})` 
                });

            return createRoot((dispose) => {
                const scope = getScope();
                const instance = create(focusedMonitor, scope) as Astal.Window;
                const app = Adw.Application.get_default();
                const id = instance.connect("close-request", () => dispose());

                instance.set_monitor(focusedMonitor);
                instance.set_application(app as Adw.Application);

                scope.onCleanup(() => GObject.signal_handler_is_connected(instance, id) &&
                    instance.disconnect(id)
                );

                return instance;
            });
        }
    }

    /** add a window with `name` to the window/widget management system
      * 
      * @param name the window name 
      * @param create the window generator method(that creates the window(s) instance(s))
      * @param autoOpen whether to open the window right after adding it to the list(default: `false`) 
      *
      * @returns `true` if the process succeded, with types for the updated window list, if needed */
    public addWindow<T1 extends string>(name: T1, create: () => Astal.Window|Array<Astal.Window>, autoOpen: boolean = false): this is Windows<T|T1> {
        this.#windows[name] = { create, status: Windows.Status.CLOSED };
        if(autoOpen)
            this.open(name as unknown as T);

        return true;
    }

    public hasWindow(name: T): boolean;
    public hasWindow(name: string): boolean;
    public hasWindow(name: string|T): boolean {
        return Boolean(this.windows?.[name as keyof typeof this.windows]);
    }

    public getWindows(): Array<Windows.Window> {
        return Object.values(this.windows);
    }
    
    /** get the hyprland focused monitor's id. 
      * if there's no focused monitor, fallback to `0`.
      * `null` if no monitors were found 
      *
      * @returns the monitor id. if none are found, `null` */
    public static getFocusedMonitorId(): number|null {
        const monitors = Compositor.getDefault().monitors;
        return monitors.find(mon => mon.focused)?.id ?? monitors[0]?.id ?? null;
    }

    public isOpen(name: T): boolean {
        return Boolean(this.#windows[name]?.status === Windows.Status.OPEN);
    }

    public open(name: T, ignoreOpenStatus: boolean = false): void {
        const window = this.#windows[name];
        if(!window)
            throw new Error(`Cannot open a window (\`${name}\`) that is not registered/doesn't exist`);

        if(this.isOpen(name) && !ignoreOpenStatus)
            return;

        const instance = window.create();

        if(Array.isArray(instance)) {
            window.data! = instance.map(win => {
                win.show();
                return { instance: win, connections: [] };
            });
        } else {
            window.data = { instance: instance, connections: [] };
            instance.show();
        }

        this.#windows[name].status = Windows.Status.OPEN;
        this.connectWindow(name);

        this.emit("window-open", name);
        this.notify("open-windows");
    }

    public close(name: T): void {
        const window = this.#windows[name];
        const data = window?.data;
        if(!window)
            throw new Error(`Cannot close a window (\`${name}\`) that is not registered/doesn't exist`);

        if(!this.isOpen(name))
            return;

        // disconnect before closing windows to prevent malfunctioning
        this.disconnectWindow(name);

        Array.isArray(data) ?
            data.map(inst => inst.instance!.close())
        : data?.instance.close();

        this.#windows[name].status = Windows.Status.CLOSED;

        this.emit("window-closed", name);
        this.notify("open-windows");
    }

    public toggle(name: T): void {
        this.isOpen(name) ? this.close(name) : this.open(name);
    }

    public closeAll(): void {
        this.openWindows.forEach(name => this.close(name as T));
        this.notify("open-windows");
    }
    
    public reopen(): void {
        const openWins = [...this.openWindows];
        this.closeAll();
        openWins.forEach(name => this.open(name as T));
    }
}

namespace Windows {
    export enum Status {
        CLOSED = 0,
        OPEN = 1
    }

    export type Data = Window.Data;
    export type Window = {
        create: () => (Astal.Window | Array<Astal.Window>);
        data?: Window.Data | Array<Window.Data>;
        status: Status;
    };
    
    export namespace Window {
        export type Data = {
            instance: Astal.Window;
            connections: Array<number>;
        };
    }

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "window-open": (name: string) => void;
        "window-closed": (name: string) => void;
    }
}

export default Windows;
