import AstalHyprland from "gi://AstalHyprland";
import Compositor from "../..";
import Hyprland from "./compositor";
import { register } from "ags/gobject";
import { createBinding, createComputed } from "ags";


@register({ GTypeName: "ClshHyprlandClient" })
class Client extends Compositor.Client {
    declare $signals: Client.SignalSignatures;

    protected subs: Array<() => void> = [];
    public readonly client: AstalHyprland.Client;

    get class() { return this.client.get_class(); }
    get title() { return this.client.get_title(); }
    get mapped() { return this.client.get_mapped(); }
    get address() { return this.client.get_address(); }
    get xwayland() { return this.client.get_xwayland(); }
    get initialTitle() { return this.client.get_initial_title(); }
    get initialClass() { return this.client.get_initial_class(); }
    get allocation() { return this._allocation; }


    constructor(compositor: Hyprland, client: AstalHyprland.Client) {
        super(compositor);
        this.client = client;

        const workspace = this.compositor.workspaces.find(ws => ws.id === this.client.workspace.get_id());
        if(workspace)
            this._workspace = workspace;

        this.syncAllocation();

        this.subs.push(
            createBinding(this.client, "class").subscribe(() => {
                this.notify("class");
            }),
            createBinding(this.client, "title").subscribe(() => {
                this.notify("title");
            }),
            createBinding(this.client, "mapped").subscribe(() => {
                this.notify("mapped");
            }),
            createBinding(this.client, "address").subscribe(() => {
                this.notify("address");
            }),
            createBinding(this.client, "xwayland").subscribe(() => {
                this.notify("xwayland");
            }),
            createComputed([
                createBinding(this.client, "x"),
                createBinding(this.client, "y"),
                createBinding(this.client, "width"),
                createBinding(this.client, "height")
            ]).subscribe(() => {
                this.syncAllocation();
            }),
            (() => {
                const id = AstalHyprland.get_default().connect("client-moved", (_, c, ws) => {
                    if(c.get_address() !== this.address)
                        return;

                    const workspace = this.compositor.workspaces.find(w => w.id === ws.get_id());
                    if(!workspace) {
                        console.warn("No equivalent workspace instance found for moved client");
                        return;
                    }

                    this._workspace = workspace;
                    this.notify("workspace");
                });

                return () => AstalHyprland.get_default().disconnect(id);
            })()
        );

    }

    /** creates the object if it doesn't exist, or else returns the existing instance */
    public static tryNew(compositor: Hyprland, client: AstalHyprland.Client) {
        const match = compositor.clients.find(cl => cl.address === client.address);

        return match ?? new this(compositor, client);
    }

    /** synchronize the allocation rectangle with the client's properties */
    protected syncAllocation(): void {
        this._allocation ??= new Compositor.Client.Allocation();

        this._allocation.x = this.client.get_x(),
        this._allocation.y = this.client.get_y(),
        this._allocation.width = this.client.get_width(),
        this._allocation.height = this.client.get_height()
    }

    dispose(): void {
        this.subs.forEach(unsub => unsub());
    }

    close(): void {
        if((this.compositor as Hyprland).configProvider === Hyprland.ConfigProvider.LUA) {
            AstalHyprland.get_default().dispatch("hl.dsp.window.close", `("address:0x${this.address}")`);
            return;
        }

        AstalHyprland.get_default().dispatch("closewindow", `address:0x${this.address}`);
    }

    kill(): void {
        if((this.compositor as Hyprland).configProvider === Hyprland.ConfigProvider.LUA) {
            AstalHyprland.get_default().dispatch("hl.dsp.window.kill", `("address:0x${this.address}")`);
            return;
        }

        AstalHyprland.get_default().dispatch("killwindow", `address:0x${this.address}`);
    }
}

namespace Client {
    export interface SignalSignatures extends Compositor.Client.SignalSignatures {}
    export interface ConstructorProps {
        client: AstalHyprland.Client;
    }
}

export default Client;
