import { register } from "ags/gobject";
import Compositor from "../..";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import Hyprland from "./compositor";
import { createBinding, createComputed } from "ags";


@register({ GTypeName: "ClshHyprlandMonitor" })
class Monitor extends Compositor.Monitor {
    #subs: Array<() => void> = [];
    #monitor: AstalHyprland.Monitor;

    private get monitor() { return this.#monitor; }
    set mode(mode: string) {
        super.mode = mode;
        // TODO apply mode to hyprland monitor
    }

    set scaling(scale: number) {
        super.scaling = scale;
        // TODO apply scale to hyprland monitor
    }

    constructor(compositor: Hyprland, monitor: AstalHyprland.Monitor) {
        super(compositor,
            monitor.id,
            monitor.name,
            monitor.availableModes,
            Monitor.modeToString(
                monitor.width,
                monitor.height,
                monitor.refreshRate
            ),
            monitor.scale ?? 1
        );

        this.#monitor = monitor;
        this.#subs.push(
            createComputed(() => {
                createBinding(this.monitor, "width")();
                createBinding(this.monitor, "height")();
                createBinding(this.monitor, "refreshRate")();
            }).subscribe(() => {
                super.mode = Monitor.modeToString(
                    monitor.width,
                    monitor.height,
                    monitor.refreshRate
                );
            }),
            createBinding(this.monitor, "availableModes").subscribe(() => {
                this._modes = this.monitor.availableModes;
                this.notify("modes");
            }),
            createBinding(this.monitor, "scale").subscribe(() => {
                super.scaling = this.monitor.scale ?? 1;
            })
        );
    }

    run_dispose(): void {
        this.#subs.forEach(unsub => unsub());
    }
}

namespace Monitor {
    export interface SignalSignatures extends Compositor.Monitor.SignalSignatures {}
    export interface ConstructorProps extends Compositor.Monitor.ConstructorProps {}
}

export default Monitor;
