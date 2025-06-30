import GLib from "gi://GLib?version=2.0";

import GObject, { getter, property, register } from "ags/gobject";


/** WIP Global implementation of a system that supports 
* a variety of Wayland Compositors */
export namespace Compositor {

let instance: _Compositor;

@register({ GTypeName: "CompositorMonitor" })
class _CompositorMonitor extends GObject.Object {
    public readonly width: number;
    public readonly height: number;

    @property(Boolean)
    public readonly mirror: boolean;

    constructor(width: number, height: number, mirror: boolean = false) {
        super();

        this.width = width;
        this.height = height;
        this.mirror = mirror;
    }
}

@register({ GTypeName: "CompositorWorkspace" })
class _CompositorWorkspace extends GObject.Object {
    public readonly id: number;

    @getter(_CompositorMonitor)
    public readonly monitor: _CompositorMonitor;

    constructor(monitor: _CompositorMonitor, id: number) {
        super();

        this.monitor = monitor;
        this.id = id;
    }
}

@register({ GTypeName: "Compositor" })
class _Compositor extends GObject.Object {
    #workspaces: Array<_CompositorWorkspace> = [];

    @property()
    public get workspaces() { return this.#workspaces; }
};


export function getDefault(): _Compositor {
    if(!instance)
        instance = new _Compositor();

    return instance;
}

export const Compositor = _Compositor, 
    CompositorWorkspace = _CompositorWorkspace,
    CompositorMonitor = _CompositorMonitor;

/** Uses the XDG_CURRENT_DESKTOP variable to detect running compositor's name.
  * ---
  * @returns running wayland compositor's name (lowercase) or `undefined` if variable's not set */
export function getName(): string|undefined {
    return GLib.getenv("XDG_CURRENT_DESKTOP") ?? undefined;
}

}
