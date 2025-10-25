import { Compositors } from ".";
import { register } from "ags/gobject";
import { createRoot, getScope, Scope } from "ags";
import { createScopedConnection } from "../utils";


import AstalHyprland from "gi://AstalHyprland";


type Event = "activewindow" | "activewindowv2"
            | "workspace" | "workspacev2"
            | "focusedmon" | "focusedmonv2";

@register({ GTypeName: "CompositorHyprland" })
export class CompositorHyprland extends Compositors.Compositor {
    #scope: Scope;
    hyprland: AstalHyprland.Hyprland;

    protected _focusedClient: Compositors.Client | null = null;

    constructor() {
        super();

        try {
            this.hyprland = AstalHyprland.get_default();
        } catch(e) {
            throw new Error(`Couldn't initialize CompositorHyprland: ${e}`);
        }

        this.#scope = createRoot(() => {
            createScopedConnection(
                this.hyprland, "event", (e, args) => {
                    switch(e as Event) {
                        case "activewindowv2": 
                            const address = args;
                            const clients = AstalHyprland.get_default().clients;
                            const focusedClient = clients.filter(c =>
                                c.address === address
                            )[0];

                            if(focusedClient) {
                                this._focusedClient = new Compositors.Client({
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
