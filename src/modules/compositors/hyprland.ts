import { Compositor } from ".";
import { register } from "ags/gobject";

import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";
import { Socket } from "../socket";
import { exec } from "ags/process";


@register({ GTypeName: "ClshCompositorHyprland" })
export class CompositorHyprland extends Compositor {
    #eventSock: Socket;
    hyprland: AstalHyprland.Hyprland = AstalHyprland.get_default();

    constructor() {
        super();

        const instSignature = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
        if(instSignature === null || instSignature.trim() === "")
            throw new Error("Compositor: Hyprland: Couldn't get instance signature");

        this.#eventSock = new Socket(
            Socket.Type.CLIENT,
            `${GLib.get_user_runtime_dir()}/hypr/${instSignature}/.socket2.sock`,
            true
        );

        const clients = this.getClients();
        if(clients && clients.length > 0) {
            this._clients = clients.map(c => new Compositor.Client({
                title: c.title,
                position: c.at,
                mapped: c.mapped,
                address: c.address,
                initialClass: c.initialClass,
                class: c.class
            }));
            this.notify("clients");
        }

        const focusedClientAddress = this.getActiveClient()?.address;
        if(focusedClientAddress) {
            this._focusedClient = this.clients.find(client => client.address === focusedClientAddress)!;
            this.notify("focused-client");
        }

        this.#eventSock.scopeConnect("received", (data: string) => {
            let [event, info] = data.split(">>") as [CompositorHyprland.Event, string|undefined];

            if(/^.*>>$/.test(event)) { // check if there are no extra data to the event
                event = event.replace(/^(.*)>>$/, "$1") as CompositorHyprland.Event;
                info = undefined;
            }

            //console.log(event, info); // debugging
            this.handleEvents(event, data);
        });
    }

    private handleEvents(event: CompositorHyprland.Event, data: string): void {
        switch(event as CompositorHyprland.Event) {
            case "activewindowv2":
                const address = data;
                const focusedClient = this.getActiveClient();

                if(focusedClient) {
                    this._focusedClient = new Compositor.Client({
                        address: address,
                        class: focusedClient.class ?? "",
                        initialClass: focusedClient.initialClass ?? "",
                        mapped: focusedClient.mapped,
                        position: [focusedClient.at[0], focusedClient.at[1]],
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

    private getClients(): Array<CompositorHyprland.Client> {
        return (JSON.parse(exec("hyprctl clients -j")) as Array<CompositorHyprland.Client>);
    }

    private getActiveClient(): CompositorHyprland.Client|null {
        const client = JSON.parse(exec("hyprctl -j activewindow")) as CompositorHyprland.Client|{};

        if(Object.keys(client).length === 0)
            return null;

        return client as CompositorHyprland.Client;
    }
}

export namespace CompositorHyprland {
    export type Event = "activewindow"
        | "activewindowv2"
        | "workspace"
        | "windowtitle"
        | "windowtitlev2"
        | "workspacev2"
        | "focusedmon"
        | "focusedmonv2";

    export type Client = {
        address: string,
        mapped: boolean,
        hidden: boolean,
        at: [number, number],
        size: [number, number],
        workspace: {
          id: number,
          name: number
        },
        floating: boolean,
        pseudo: boolean,
        monitor: number,
        class: string,
        title: string,
        initialClass: string,
        initialTitle: string,
        pid: number,
        xwayland: boolean,
        pinned: boolean,
        fullscreen: number,
        fullscreenClient: number,
        grouped: Array<Client>,
        tags: Array<string>,
        swallowing: string,
        focusHistoryID: number,
        inhibitingIdle: boolean,
        xdgTag: string,
        xdgDescription: string,
        contentType: string
    };
}
