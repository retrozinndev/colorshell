import { Compositor } from ".";
import { register } from "ags/gobject";
import { createRoot, getScope, Scope } from "ags";
import { createScopedConnection } from "../utils";

import AstalHyprland from "gi://AstalHyprland";


@register({ GTypeName: "ClshCompositorHyprland" })
export class CompositorHyprland extends Compositor {
    #scope: Scope;
    hyprland: AstalHyprland.Hyprland = AstalHyprland.get_default();

    constructor() {
        super();

        this.#scope = createRoot(() => {
            createScopedConnection(
                this.hyprland, "event", (e, args) => {
                    switch(e as CompositorHyprland.Event) {
                        case "activewindowv2": 
                            const address = args;
                            const clients = AstalHyprland.get_default().clients;
                            const focusedClient = clients.filter(c =>
                                c.address === address
                            )[0];

                            if(focusedClient) {
                                this._focusedClient = new Compositor.Client({
                                    address: address,
                                    class: focusedClient.class ?? "",
                                    initialClass: focusedClient.initialClass ?? "",
                                    mapped: focusedClient.mapped,
                                    position: [focusedClient.x, focusedClient.y],
                                    title: focusedClient.title ?? ""
                                });

                                this.notify("focused-client");
                                return;
                            }

                            this._focusedClient = null;
                            this.notify("focused-client");
                        break;
                    }
                }
            );

            return getScope();
        });
    }


    vfunc_dispose(): void {
        this.#scope.dispose();
    }
}

export namespace CompositorHyprland {
    export type Event = "activewindow"
        | "activewindowv2"
        | "workspace"
        | "workspacev2"
        | "focusedmon"
        | "focusedmonv2";
}
