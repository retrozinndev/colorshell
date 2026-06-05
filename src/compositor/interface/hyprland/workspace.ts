import { createBinding, createComputed } from "ags";
import Compositor from "../..";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { register } from "ags/gobject";
import Hyprland from "./compositor";
import Client from "./client";


@register({ GTypeName: "ClshHyprlandWorkspace" })
class Workspace extends Compositor.Workspace {
    readonly #ws: AstalHyprland.Workspace;
    readonly #subs: Array<() => void> = [];
    protected get ws() { return this.#ws; }

    get name() { return this.ws.get_name(); }

    constructor(compositor: Hyprland, workspace: AstalHyprland.Workspace) {
        super(compositor, { id: workspace.get_id() });

        this.#ws = workspace;
        this.syncClients();
        this.syncLastFocusedClient();

        this.#subs.push(
            createComputed([
                createBinding(this.ws, "clients"),
                createBinding(this.compositor, "clients")
            ]).subscribe(() => {
                this.syncClients();
            }),
            createBinding(this.ws, "lastClient").subscribe(() => {
                this.syncLastFocusedClient();
            })
        );
    }

    /** creates the object if it doesn't exist, or else returns the existing instance */
    public static tryNew(compositor: Hyprland, workspace: AstalHyprland.Workspace) {
        const match = compositor.workspaces.find(w => w.id === workspace.id);

        return match ?? new this(compositor, workspace);
    }

    protected syncClients(): void {
        this._clients = this.ws.get_clients().map(cl => {
            const match = this.compositor.clients.find(c => c.address === cl.address);
            if(!match) {
                const client = new Client(this.compositor as Hyprland, cl);
                this.compositor.clients.push(client);
                this.compositor.notify("clients");
                this.compositor.emit("client-added", client);

                return client;
            }

            return match;
        });
        this.notify("clients");
    }

    protected syncLastFocusedClient(): void {
        const client = this.ws.get_last_client() ?? this._clients[0];
        if(!client) {
            this._lastFocusedClient &&= null;
            this.notify("last-focused-client");
            return;
        }

        this._lastFocusedClient = this.compositor.clients.find(cl => cl.address === client.address)!;
        this.notify("last-focused-client");
    }

    dispose() {
        this.#subs.forEach(unsub => unsub());
    }

    focus(): void {
        const prov = (this.compositor as Hyprland).configProvider;
        if(this.name?.startsWith("special:")) {
            const dispatcher = prov === Hyprland.ConfigProvider.LUA ?
                ["workspace.toggle_special", `"${this.name.replace(/^special\:/, "")}")`]
            : ["togglespecialworkspace", this.name.replace(/^special\:/, "")];

            AstalHyprland.get_default().dispatch(dispatcher[0], dispatcher[1]);
            return;
        }

        if(prov === Hyprland.ConfigProvider.LUA) {
            AstalHyprland.get_default().dispatch("focus", `{workspace=${this.id}}`);
        } else {
            AstalHyprland.get_default().dispatch("workspace", this.id.toString());
        }
    }
}

namespace Workspace {
    export interface SignalSignatures extends Compositor.Workspace.SignalSignatures {}
    export interface ConstructorProps extends Compositor.Workspace.ConstructorProps {}
}

export default Workspace;
