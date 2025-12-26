import GLib from "gi://GLib?version=2.0";

import { Compositor } from "./modules/compositors";
import { CompositorHyprland } from "./modules/compositors/hyprland";


const desktopName = GLib.getenv("XDG_CURRENT_DESKTOP")?.toLowerCase();
switch(desktopName) {
    case "hyprland":
        Compositor.instance = new CompositorHyprland();
    break;

    default:
        console.error(`This compositor(${desktopName}) is not yet implemented to colorshell. \
Please contribute by implementing it if you can! :)`);
        // TODO implement a common wayland compositor support using the proposed AstalWl library
    break;
}

