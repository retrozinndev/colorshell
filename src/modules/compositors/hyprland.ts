import { register } from "ags/gobject";
import { Compositors } from ".";
import { createRoot } from "ags";
import { createScopedConnection } from "../utils";

import AstalHyprland from "gi://AstalHyprland";


@register({ GTypeName: "CompositorHyprland" })
export class CompositorHyprland extends Compositors.Compositor {
    hyprland: AstalHyprland.Hyprland;

    constructor() {
        super();

        try {
            this.hyprland = AstalHyprland.get_default();
        } catch(e) {
            throw new Error(`Couldn't initialize CompositorHyprland: ${e}`);
        }

        createRoot(() => {
            createScopedConnection(
                this.hyprland, "workspace-added", (hws) => {
                    // check workspace existance
                    if(this._workspaces.filter(w => w.id === hws.id)[0])
                        return;

                    // TODO
                }
            );
        });
    }
}
