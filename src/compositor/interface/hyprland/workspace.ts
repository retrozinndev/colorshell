import { createBinding, createComputed } from "ags";
import Compositor from "../..";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import { register } from "ags/gobject";
import Hyprland from "./compositor";


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
            createComputed([
                createBinding(this.ws, "lastClient"),
                createBinding(this.ws, "clients")
            ]).subscribe(() => {
                this.syncLastFocusedClient();
            })
        );
    }

    /** creates the object if it doesn't exist, or else returns the existing instance */
    public static tryNew(compositor: Hyprland, workspace: AstalHyprland.Workspace) {
        const match = compositor.workspaces.find(w => w.id === workspace.id);

        return match ?? new this(compositor, workspace);
    }

    public syncClients(): void {
        this._clients = this.compositor.clients.filter(cl => cl.workspace?.id === this.id);
        this.notify("clients");
    }

    public syncLastFocusedClient(): void {
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
                ["hl.dsp.workspace.toggle_special", `("${this.name.replace(/^special\:/, "")}")`]
            : ["togglespecialworkspace", this.name.replace(/^special\:/, "")];

            AstalHyprland.get_default().dispatch(dispatcher[0], dispatcher[1]);
            return;
        }

        if(prov === Hyprland.ConfigProvider.LUA) {
            AstalHyprland.get_default().dispatch("hl.dsp.focus", `{workspace=${this.id}}`);
            return;
        }

        AstalHyprland.get_default().dispatch("workspace", this.id.toString());
    }
}

namespace Workspace {
    export interface SignalSignatures extends Compositor.Workspace.SignalSignatures {}
    export interface ConstructorProps extends Compositor.Workspace.ConstructorProps {}
}

export default Workspace;
