import { Astal } from "ags/gtk4";
import { Shell } from "./app";
import GObject, { getter, register, signal } from "ags/gobject";
import { variableToBoolean } from "./modules/utils";
import { createRoot, getScope, onCleanup } from "ags";
import { Bar } from "./window/bar";
import { OSD } from "./window/osd";
import { ControlCenter } from "./window/control-center";
import { FloatingNotifications } from "./window/floating-notifications";
import { CenterWindow } from "./window/center-window";
import { LogoutMenu } from "./window/logout-menu";
import { AppsWindow } from "./window/apps-window";

import AstalHyprland from "gi://AstalHyprland";


export type WindowInstance = { instance?: Astal.Window, connections: Array<number> };
export type WindowData = {
    create: () => (Astal.Window | Array<Astal.Window>);
    instance?: WindowInstance | Array<WindowInstance>;
    status?: "open" | "closed";
};


/**
 * Windowing System
 * Possible actions: getting window states, close, open, toggle windows and
 * registering windows.
 * Also contains util functions to create dynamic windows, opening the window only on focused 
 * monitor, or all available monitors!
 */
@register({ GTypeName: "Windows" })
export class Windows extends GObject.Object {
    private static instance: (Windows | null);

    declare $signals: GObject.Object.SignalSignatures & {
        "window-open": (name: string) => void;
        "window-closed": (name: string) => void;
    };

    #scope!: ReturnType<typeof getScope>;
    #windows: Record<string, WindowData> = {
        "bar": { create: this.createWindowForMonitors(Bar) },
        "osd": { create: this.createWindowForFocusedMonitor(OSD), },
        "control-center": { create: this.createWindowForFocusedMonitor(ControlCenter), },
        "center-window": { create: this.createWindowForFocusedMonitor(CenterWindow), },
        "logout-menu": { create: this.createWindowForFocusedMonitor(LogoutMenu), },
        "floating-notifications": { create: this.createWindowForFocusedMonitor(FloatingNotifications), },
        "apps-window": { create: this.createWindowForFocusedMonitor(AppsWindow) }
    };

    @signal(String) windowOpen(_name: string) {}
    @signal(String) windowClosed(_name: string) {}

    @getter(Object)
    get windows(): object { return this.#windows; }

    @getter(Array)
    get openWindows(): Array<string> {
        return Object.keys(this.#windows).filter((key) => 
            this.#windows[key].status === "open");
    }

    constructor() {
        super();

        createRoot((dispose) => {
            this.#scope = getScope();
            Shell.getDefault().scope.onMount(dispose);

            // Listen to monitor events
            const hyprConnections = [
                AstalHyprland.get_default().connect("monitor-added", () => 
                    this.reopen()),
                AstalHyprland.get_default().connect("monitor-removed", () => 
                    AstalHyprland.get_default().get_monitors().length > 0 &&
                        this.reopen())
            ];

            onCleanup(() => {
                hyprConnections.forEach(id => AstalHyprland.get_default().disconnect(id));
                this.openWindows.forEach(name => this.disconnectWindow(name));
            });

        });
    }

    private disconnectWindow(name: string) {
        if(!variableToBoolean(this.#windows[name]?.instance) || !this.#windows[name]) {
            console.error(`Windows: couldn't disconnect window's connections: either the window \`${name
                }\` doesn't exist in the windows list or it has no valid instance to disconnect signals from(not open)`);
            return;
        }

        const window = this.#windows[name].instance!;

        if(Array.isArray(window)) {
            window.forEach(win => {
                this._disconnectAllFromInstance(win.instance!, win.connections!)
                win.connections = [];
            });

            return;
        }

        this._disconnectAllFromInstance(window.instance!, window.connections!);
        window.connections = [];
    }

    private _disconnectAllFromInstance(instance: GObject.Object, connections: Array<number>): void {
        connections.forEach(id => 
            GObject.signal_handler_is_connected(instance, id) &&
                instance.disconnect(id));
    }

    private hasConnections(name: string): boolean {
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

    private connectWindow(name: string) {
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
                    window.status = "closed";
                    this.notify("open-windows");
                })
            ]);

            return;
        }

        window.instance.connections = [
            window.instance.instance!.connect("close-request", () => {
                this.disconnectWindow(name);
                delete window.instance;
                window.status = "closed";
                this.notify("open-windows");
            })
        ];
    }

    public static getDefault(): Windows {
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
    public createWindowForMonitors(create: (mon: number, scope: ReturnType<typeof getScope>) => GObject.Object|Astal.Window): (() => Array<Astal.Window>) {
        const monitors = AstalHyprland.get_default().get_monitors();

        if(monitors.length < 1) 
            throw new Error("Couldn't create window for monitors", {
                cause: "No monitors connected on Hyprland"
            });

        // create a scope for every window generator function and dispose on ::close-request
        return () => monitors.map(mon => {
            return createRoot(() => {
                const scope = getScope();
                const instance = create(mon.id, scope) as Astal.Window;
                const connection: number = instance.connect("close-request", () => 
                    scope.dispose());

                this.#scope.onMount(scope.dispose);

                scope.onCleanup(() => 
                    GObject.signal_handler_is_connected(instance, connection) &&
                        instance.disconnect(connection)
                );

                return instance;
            })
        })
    }

    /**
     * Creates a window instance for focused monitor only
     * @param create generates the window. use provided monitor number in the returned window
     * @returns a function that when called, returns a Astal.Window instance
     * @throws Error if no focused monitor is found
     */
    public createWindowForFocusedMonitor(create: (mon: number, scope: ReturnType<typeof getScope>) => GObject.Object|Astal.Window): (() => Astal.Window) {
        const focusedMonitor = this.getFocusedMonitorId();

        if(focusedMonitor == null) 
            throw new Error("Couldn't create window for focused monitor", { 
                cause: `No focused monitor found (${typeof focusedMonitor})` 
            });

        return () => {
            return createRoot((dispose) => {
                const scope = getScope();
                const instance = create(focusedMonitor, scope) as Astal.Window;
                const connection = instance.connect("close-request", () => dispose());

                this.#scope.onMount(dispose)
                scope.onCleanup(() => 
                    GObject.signal_handler_is_connected(instance, connection) &&
                        instance.disconnect(connection)
                );

                return instance;
            });
        }
    }

    public addWindow(name: string, create: () => Astal.Window|Array<Astal.Window>): void {
        this.#windows[name] = { create };
    }

    public hasWindow(name: string): boolean {
        return Boolean(this.windows?.[name as keyof typeof this.windows]);
    }

    public getWindows(): Array<(() => (Astal.Window | Array<Astal.Window>))> {
        return Object.values(this.windows);
    }
    
    public getFocusedMonitorId(): (number|null) {
        return AstalHyprland.get_default().get_monitors().filter(mon => mon.focused)?.[0]?.id ?? null;
    }

    public isOpen(name: string): boolean {
        return this.openWindows.includes(name);
    }

    public open(name: string, ignoreOpenStatus: boolean = false): void {
        if(this.isOpen(name) && !ignoreOpenStatus) return;

        const window = this.#windows[name];
        if(!window) {
            console.error(`Windows: cannot open a window (\`${name}\`) that is not registered/doesn't exist.`);
            return;
        }

        this.#windows[name].status = "open";
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

    public close(name: string): void {
        if(!this.isOpen(name)) return;

        this.disconnectWindow(name);
        const window = this.#windows[name];

        if(Array.isArray(window.instance)) 
            window.instance.map(inst => inst.instance!.close());
        else 
            window.instance!.instance!.close();

        this.#windows[name].status = "closed";

        this.emit("window-closed", name);
        this.notify("open-windows");
    }

    public toggle(name: string): void {
        this.isOpen(name) ? this.close(name) : this.open(name);
    }

    public closeAll(): void {
        this.openWindows.forEach(name => this.close(name));
    }

    public reopen(): void {
        const openWins = [ ...this.openWindows ];
        this.closeAll();
        openWins.forEach(name => this.open(name));
    }
}
