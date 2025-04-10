import { App, Widget } from "astal/gtk3";

import { Bar } from "./window/Bar";
import { OSD } from "./window/OSD";
import { ControlCenter } from "./window/ControlCenter";
import { CenterWindow } from "./window/CenterWindow";
import { LogoutMenu } from "./window/LogoutMenu";
import { FloatingNotifications } from "./window/FloatingNotifications";
import { AppsWindow } from "./window/AppsWindow";
import AstalHyprland from "gi://AstalHyprland";
import { GObject } from "astal";

/**
 * get open windows / interact with windows(e.g.: close, open or toggle)
 */
export const Windows = GObject.registerClass({
    GTypeName: "Windows",
    Signals: {
        "open": { param_types: [ GObject.TYPE_STRING ] },
        "close": { param_types: [ GObject.TYPE_STRING ] }
    },
    Properties: {
        "open-windows": GObject.ParamSpec.jsobject(
            "open-windows",
            "Open Windows",
            "A Readonly object that stores open GTK+ Windows",
            GObject.ParamFlags.READABLE
        )
    }
}, class Windows extends GObject.Object {
    #openWindows: Record<string, Widget.Window | Array<Widget.Window>> = {};
    static #instance: (Windows | null);

    #windows: Record<string, (() => (Widget.Window | Array<Widget.Window>))> = {
        "bar": this.createWindowForMonitors(Bar),
        "osd": this.createWindowForFocusedMonitor(OSD),
        "control-center": this.createWindowForFocusedMonitor(ControlCenter),
        "center-window": this.createWindowForFocusedMonitor(CenterWindow),
        "logout-menu": this.createWindowForFocusedMonitor(LogoutMenu),
        "floating-notifications": this.createWindowForFocusedMonitor(FloatingNotifications),
        "apps-window": this.createWindowForFocusedMonitor(AppsWindow)
    };

    #windowConnections: Record<string, (Array<number> | Array<Array<number>>)> = {};
    #appConnections: Array<number> = [];

    get windows() { return this.#windows; }
    get openWindows(): Record<string, Widget.Window | Array<Widget.Window>> { return this.#openWindows; };

    constructor() {
        super();

        // Listen to monitor events
        this.#appConnections.push(
            App.connect("monitor-added", (_, _monitor) => {
                AstalHyprland.get_default().get_monitors().length > 0 && 
                    this.reopen();
            }),
            App.connect("monitor-removed", (_, monitor) => {
                Object.values(this.openWindows).map((window: (Array<Widget.Window> | Widget.Window), i: number) => {
                    if(Array.isArray(window)) {
                        window = window as Array<Widget.Window>;
                        window.map(win => {
                            if(win.get_current_monitor() === monitor) {
                                win?.close();
                                this.openWindows[i] = (this.openWindows[i] as Array<Widget.Window>).filter(item =>
                                    item !== win);
                            }
                        });

                        if((this.openWindows[i] as Array<Widget.Window>).length < 1) 
                            delete this.openWindows[i];
                    }

                    window = window as Widget.Window;
                    if(window.get_current_monitor() === monitor) 
                        window.close();
                });
            })
        );
    }

    vfunc_dispose() {
        Object.keys(this.#windowConnections).map(name => 
            this.disconnectWindow(name));

        this.#appConnections.map(id => 
            GObject.signal_handler_is_connected(App, id) && 
                App.disconnect(id));
    }

    private disconnectWindow(name: keyof typeof this.windows) {
        const window = this.openWindows[name];
        if(!window) {
            console.log("couldn't disconnect, window is not open");
            return;
        }

        this.#windowConnections[name].map((id: Array<number> | number) => {
            if(Array.isArray(window)) {
                window.map((win, i) => {
                    const curId = (id as Array<number>)[i];

                    GObject.signal_handler_is_connected(win, curId) && 
                        win.disconnect(curId);
                });
                return;
            }

            GObject.signal_handler_is_connected(window, id as number) &&
                window.disconnect(id as number);
        });

        delete this.#windowConnections[name];
    }

    private connectWindow(name: keyof typeof this.windows) {
        if(Object.hasOwn(this.#windowConnections, name)) return;

        if(!this.openWindows?.[name]) {
            console.log(`${name} is not open, will not connect`);
            return;
        }

        if(Array.isArray(this.openWindows[name])) {
            this.#windowConnections[name] = this.openWindows[name].map(win => [
                win.connect("map", (window) => {
                    if(this.isVisible(name)) return;

                    this.#openWindows[name] = window;
                    this.notify("open-windows");
                }),
                win.connect("destroy", () => {
                    this.disconnectWindow(name);
                    this.notify("open-windows");
                })
            ]);

            return;
        }

        this.#windowConnections[name] = [
            this.openWindows[name].connect("map", (window) => {
                if(this.isVisible(name)) return;

                this.#openWindows[name] = window;
                this.notify("open-windows");
            }),
            this.openWindows[name].connect("destroy", () => {
                this.disconnectWindow(name);
                delete this.#openWindows[name];
                this.notify("open-windows");
            })
        ];
    }

    public static getDefault(): Windows {
        if(!this.#instance)
            this.#instance = new Windows();

        return this.#instance;
    }

    /**
     * Creates a window instance for every monitor connected
     * @param windowFun function: (mon: number) => Widget.Window, returned window must use provided monitor number
     * @returns a function that when called, returns Array<Widget.Window>
     * @throws Error if there are no monitors connected
     */
    public createWindowForMonitors(windowFun: (mon: number) => Widget.Window): (() => Array<Widget.Window>) {
        const monitors = AstalHyprland.get_default().get_monitors();
        if(monitors.length < 1) 
            throw new Error("Couldn't create window for monitors", {
                cause: `No monitors connected on Hyprland`
            });

        return () => monitors.map(mon => windowFun(mon.id));
    }

    /**
     * Creates a window instance for focused monitor only
     * @param windowFun function: (mon: number) => Widget.Window, returned window must use provided monitor number
     * @returns a function that when called, returns a Widget.Window instance
     * @throws Error if no focused monitor is found
     */
    public createWindowForFocusedMonitor(windowFun: (mon: number) => Widget.Window): (() => Widget.Window) {
        const focusedMonitor = AstalHyprland.get_default()
            .get_monitors().filter(mon => mon.focused)[0];

        if(!focusedMonitor) 
            throw new Error("Couldn't create window for focused monitor", { 
                cause: `No focused monitor found (${typeof focusedMonitor})` 
            });

        return () => windowFun(focusedMonitor.id);
    }

    public addWindow(name: string, window: (() => (Widget.Window | Array<Widget.Window>))): void {
        this.#windows[name] = window;
    }

    public hasWindow(name: keyof typeof this.windows): boolean {
        return Boolean(this.windows?.[name as keyof typeof this.windows]);
    }

    public getWindow(name: (keyof typeof this.windows | string)): ((() => (Widget.Window | Array<Widget.Window>)) | undefined) {
        return this.windows?.[name as keyof typeof this.windows];
    }

    public getOpenWindow(name: (keyof typeof this.openWindows)): (Widget.Window | Array<Widget.Window> | undefined) {
        return this.openWindows?.[name as keyof typeof this.openWindows];
    }

    public getWindows(): Array<(() => (Widget.Window | Array<Widget.Window>))> {
        return Object.values(this.windows);
    }

    public isVisible(name: keyof typeof this.windows): boolean {
        return Object.hasOwn(this.#openWindows, name) || Object.hasOwn(this.#windowConnections, name);
    }

    public open(name: keyof typeof this.windows): void {
        if(this.isVisible(name)) return;

        let window: (() => (Widget.Window | Array<Widget.Window>)) = this.getWindow(name)!;
        const openWindows: (Array<Widget.Window> | Widget.Window) = window();
        this.#openWindows[name] = openWindows;

        this.connectWindow(name);

        this.emit("open", name);
        this.notify("open-windows");

        if(Array.isArray(openWindows)) {
            openWindows.map(win => win.show());
            return;
        }

        openWindows.show();
    }

    public close(name: keyof typeof this.windows): void {
        if(!this.isVisible(name)) return;
        this.disconnectWindow(name);

        const window = this.#openWindows[name];
        delete this.#openWindows[name];

        if(Array.isArray(window)) {
            window.map(win => win.close());
            this.emit("close", name);
            this.notify("open-windows");
            return;
        }

        window.close();
        this.emit("close", name);
        this.notify("open-windows");
    }

    public toggle(name: keyof typeof this.windows): void {
        this.isVisible(name) ? this.close(name) : this.open(name);
    }

    public closeAll(): void {
        Object.keys(this.openWindows).map(name => this.close(name));
    }

    public reopen(): void {
        const openWins = Object.keys(this.openWindows);
        this.closeAll();
        openWins.map(name => this.open(name));
    }
}).getDefault();
