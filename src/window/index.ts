import { Astal } from "ags/gtk4";
import GObject, { getter, register, signal } from "ags/gobject";
import { createScopedConnection, variableToBoolean } from "../modules/utils";
import { createRoot, getScope, Scope } from "ags";
import AstalHyprland from "gi://AstalHyprland";
import { shellWindows } from "../windows";


/** Manage shell windows and in which monitors they appear.
  *
  * Also contains util functions to create multi-monitor and 
  * focused-monitor-only windows */
@register({ GTypeName: "Windows" })
export class Windows<T extends string = string> extends GObject.Object {
    private static instance: (Windows | null);

    declare $signals: Windows.SignalSignatures

    #scope: Scope;
    #windows: Record<string, Windows.Window> = {};

    @signal(String) windowOpen(_name: string) {}
    @signal(String) windowClosed(_name: string) {}

    @getter(Object)
    get windows(): object { return this.#windows; }

    @getter(Array)
    get openWindows(): Array<string> {
        return Object.keys(this.#windows).filter((key) => 
            this.#windows[key].status === Windows.Status.OPEN);
    }

    constructor() {
        super();

        this.#scope = getScope();
        this.#scope.run(() => {
            // Listen to monitor events
            createScopedConnection(
                AstalHyprland.get_default(), "monitor-added",
                () => setTimeout(() => this.reopen(), 1200) // we wait a little bit for the monitor to display
            );
            createScopedConnection(
                AstalHyprland.get_default(), "monitor-removed",
                () => AstalHyprland.get_default().get_monitors().length > 0 &&
                    setTimeout(() => this.reopen(), 1200)
            );
        });
    }

    private disconnectWindow(name: T) {
        if(!variableToBoolean(this.#windows[name]?.instance) || !this.#windows[name]) {
            console.error(`Windows: couldn't disconnect window's connections: either the window \`${name
                }\` doesn't exist in the windows list or it has no valid instance to disconnect signals from(not open)`);
            return;
        }

        const window = this.#windows[name].instance!;

        if(Array.isArray(window)) {
            window.forEach(win => {
                this._disconnectAllFromInstance(win.instance!, win.connections!)
                win.connections.splice(0, win.connections.length);
            });

            return;
        }

        this._disconnectAllFromInstance(window.instance!, window.connections!);
        window.connections.splice(0, window.connections.length);
    }

    private _disconnectAllFromInstance(instance: GObject.Object, connections: Array<number>): void {
        connections.forEach(id => 
            GObject.signal_handler_is_connected(instance, id) &&
                instance.disconnect(id));
    }

    private hasConnections(name: T): boolean {
        if(!this.openWindows.includes(name))
            return false;

        const window = this.#windows[name].instance;
        if(!window) return false;

        if(Array.isArray(window)) {
            for(const win of window) {
                if(win.connections?.length > 0) 
                    return true;
            }

            return false;
        }

        return window.connections?.length > 0;
    }

    private connectWindow(name: T) {
        if(this.hasConnections(name)) {
            console.log(`Windows: skipped connecting window: \`${name}\`. Already connected`);
            return;
        }

        if(!this.openWindows.includes(name)) {
            console.log(`Windows: \`${name}\` is not open, will not connect`);
            return;
        }

        const window = this.#windows[name as keyof typeof this.windows];
        if(!window || !window.instance) {
            console.error(`Windows: Either \`${name}\` does not exist in the window list or it doesn't have a valid instance. Please add the window before trying to manage it here`);
            return;
        }

        if(Array.isArray(window.instance)) {
            window.instance.forEach(inst => inst.connections = [
                inst.instance!.connect("close-request", () => {
                    this.disconnectWindow(name);
                    delete window.instance;
                    window.status = Windows.Status.CLOSED;
                    this.notify("open-windows");
                })
            ]);

            return;
        }

        window.instance.connections = [
            window.instance.instance!.connect("close-request", () => {
                this.disconnectWindow(name);
                delete window.instance;
                window.status = Windows.Status.CLOSED;
                this.notify("open-windows");
            })
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
            const monitors = AstalHyprland.get_default().get_monitors();

            if(monitors.length < 1) 
                throw new Error("Couldn't create window for monitors", {
                    cause: "No monitors connected on Hyprland"
                });

            return monitors.map(mon => {
                return createRoot(() => {
                    const scope = getScope();
                    const instance = create(mon.id, scope) as Astal.Window;
                    const connection: number = instance.connect("close-request", () => 
                        scope.dispose());

                    scope.onCleanup(() => 
                        GObject.signal_handler_is_connected(instance, connection) &&
                            instance.disconnect(connection)
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
                const connection = instance.connect("close-request", () => dispose());

                scope.onCleanup(() => 
                    GObject.signal_handler_is_connected(instance, connection) &&
                        instance.disconnect(connection)
                );

                return instance;
            });
        }
    }

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

    public getWindows(): Array<(() => (Astal.Window | Array<Astal.Window>))> {
        return Object.values(this.windows);
    }
    
    public static getFocusedMonitorId(): (number|null) {
        return AstalHyprland.get_default().get_monitors().find(mon => mon.focused)?.id ?? null;
    }

    public isOpen(name: T): boolean {
        return this.openWindows.includes(name);
    }

    public open(name: T, ignoreOpenStatus: boolean = false): void {
        if(this.isOpen(name) && !ignoreOpenStatus) return;

        const window = this.#windows[name];
        if(!window) {
            console.error(`Windows: cannot open a window (\`${name}\`) that is not registered/doesn't exist.`);
            return;
        }

        this.#windows[name].status = Windows.Status.OPEN;
        const windowInstance = window.create();

        if(Array.isArray(windowInstance)) {
            window.instance = windowInstance.map(wi => {
                wi.show();
                return { instance: wi, connections: [] };
            });
        } else {
            window.instance = { instance: windowInstance, connections: [] };
            windowInstance.show();
        }

        this.connectWindow(name);

        this.emit("window-open", name);
        this.notify("open-windows");
    }

    public close(name: T): void {
        if(!this.isOpen(name)) return;

        this.disconnectWindow(name);
        const window = this.#windows[name];

        if(Array.isArray(window.instance)) 
            window.instance.map(inst => inst.instance!.close());
        else 
            window.instance!.instance!.close();

        this.#windows[name].status = Windows.Status.CLOSED;

        this.emit("window-closed", name);
        this.notify("open-windows");
    }

    public toggle(name: T): void {
        this.isOpen(name) ? this.close(name) : this.open(name);
    }

    public closeAll(): void {
        this.openWindows.forEach(name => this.close(name as T));
    }

    public reopen(): void {
        const openWins = [ ...this.openWindows ];
        this.closeAll();
        openWins.forEach(name => this.open(name as T));
    }
}

export namespace Windows {
    export enum Status {
        CLOSED = 0,
        OPEN = 1
    }

    export type Data = { instance?: Astal.Window, connections: Array<number> };
    export type Window = {
        create: () => (Astal.Window | Array<Astal.Window>);
        instance?: Data | Array<Data>;
        status: Status;
    };

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "window-open": (name: string) => void;
        "window-closed": (name: string) => void;
    }
}
