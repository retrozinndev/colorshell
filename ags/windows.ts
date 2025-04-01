import { Widget } from "astal/gtk3";

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
            "A Readonly object that stores open GTKLayerShell Windows",
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

    get windows() { return this.#windows; }
    get openWindows(): Record<string, Widget.Window | Array<Widget.Window>> { return this.#openWindows; };

    vfunc_dispose() {
        for(const name of Object.keys(this.#windowConnections)) {
            const window = this.openWindows[name];
            if(!window) continue;

            this.disconnectWindow(name);
        }
    }

    private disconnectWindow(name: keyof typeof this.windows) {
        const window = this.openWindows[name];
        if(!window) {
            console.log("couldn't disconnect, window is not open");
            return;
        }

        this.#windowConnections[name].map((id: Array<number> | number) => {
            if(Array.isArray(window)) {
                window.map((win, i) => win.disconnect((id as Array<number>)[i]));
                return;
            }

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
                    this.#openWindows[name] = window;
                }),
                win.connect("destroy", () => {
                    this.disconnectWindow(name);
                    delete this.#openWindows[name];
                })
            ]);

            return;
        }

        this.#windowConnections[name] = [
            this.openWindows[name].connect("map", (window) => {
                this.#openWindows[name] = window;
            }),
            this.openWindows[name].connect("destroy", () => {
                this.disconnectWindow(name);
                delete this.#openWindows[name];
            })
        ];
    }

    public static getDefault(): Windows {
        if(!this.#instance)
            this.#instance = new Windows();

        return this.#instance;
    }

    public createWindowForMonitors(windowFun: (mon: number) => Widget.Window): (() => Array<Widget.Window>) {
        return () => AstalHyprland.get_default().get_monitors().map(mon => 
            windowFun(mon.id));
    }

    public createWindowForFocusedMonitor(windowFun: (mon: number) => Widget.Window): (() => Widget.Window) {
        return () => windowFun(AstalHyprland.get_default().get_monitors().filter(mon => mon.focused)[0].id);
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
        return Object.hasOwn(this.#openWindows, name);
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

        const windows = this.#openWindows[name];
        delete this.#openWindows[name];

        if(Array.isArray(windows)) {
            windows.map(win => win.close());
            this.emit("close", name);
            this.notify("open-windows");
            return;
        }

        windows.close();
        this.emit("close", name);
        this.notify("open-windows");
    }

    public toggle(name: keyof typeof this.windows): void {
        this.isVisible(name) ? this.close(name) : this.open(name);
    }
}).getDefault();
