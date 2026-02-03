import { Compositor } from ".";
import { register } from "ags/gobject";

import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";
import { Socket } from "../socket";
import { exec } from "ags/process";
import Gio from "gi://Gio?version=2.0";
import { decoder, makeDirectory, playSystemBell } from "../utils";
import { Shell } from "../../app";


@register({ GTypeName: "ClshCompositorHyprland" })
export class CompositorHyprland extends Compositor {
    #eventSock: Socket;
    #configDir: Gio.File = Gio.File.new_for_path(`${Shell.runtimeDir.peek_path()!}/config/hyprland`);
    #ignoreConfigReload: boolean = false;
    hyprland: AstalHyprland.Hyprland = AstalHyprland.get_default();

    constructor() {
        super();

        const instSignature = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
        if(instSignature === null || instSignature.trim() === "")
            throw new Error("Compositor: Hyprland: Couldn't get instance signature");

        this.loadConfigs();

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
        console.log(event);
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
                        position: focusedClient.at,
                        size: focusedClient.size,
                        title: focusedClient.title ?? ""
                    });

                    this.notify("focused-client");
                    return;
                }

                this._focusedClient = null;
                this.notify("focused-client");
                break;

            case "configreloaded":
                if(!this.#ignoreConfigReload) {
                    this.#ignoreConfigReload = true;
                    this.source();
                    return;
                }

                this.#ignoreConfigReload &&= false;
                break;

            case "beep":
                playSystemBell();
            break;
        }
    }

    private getClients(): Array<CompositorHyprland.Client> {
        return (JSON.parse(exec("hyprctl clients -j")) as Array<CompositorHyprland.Client>);
    }

    
    private source(): void {
        const names = Gio.resources_enumerate_children(
            "/io/github/retrozinndev/colorshell/config/hyprland",
            Gio.ResourceLookupFlags.NONE
        );
        exec("hyprctl reload");
        names.forEach(name => {
            if(!name.endsWith(".conf"))
                return;

            try {
                const out = exec(
                    `hyprctl keyword source ${this.#configDir.peek_path()!}/${name}`
                );
                !/^ok.*$/.test(out) && console.log(out)
            } catch(e) {
                console.error(e);
            }
        });
    }

    /** load necessary hyprland configs from gresource */
    private loadConfigs(): void {
        const userLastUpdatedFile = Gio.File.new_for_path(`${this.#configDir.peek_path()!}/.last-updated`);
        const names = Gio.resources_enumerate_children(
            "/io/github/retrozinndev/colorshell/config/hyprland",
            Gio.ResourceLookupFlags.NONE
        );

        if(userLastUpdatedFile.query_exists(null)) {
            // check if data is different
            const configlastUpdated = decoder.decode(Gio.resources_lookup_data(
                "/io/github/retrozinndev/colorshell/config/hyprland/.last-updated", null
            ).toArray());

            const userLastUpdated = decoder.decode(userLastUpdatedFile.read(null).read_bytes(32, null).toArray());

            if(configlastUpdated === userLastUpdated) {
                this.source();
                return; // no need to update, since it's unchanged/same
            }
        }

        const files = names.map(name => [
            name,
            Gio.resources_lookup_data(
                `/io/github/retrozinndev/colorshell/config/hyprland/${name}`,
                Gio.ResourceLookupFlags.NONE
            )
        ] satisfies [string, GLib.Bytes]);

        makeDirectory(`${Shell.runtimeDir.peek_path()!}/config/hyprland`);
        files.forEach(([name, data]) => {
            const file = Gio.File.new_for_path(`${this.#configDir.peek_path()!}/${name}`);

            try {
                !file.query_exists(null) && 
                    file.create(null, null);

                file.replace_contents(
                    data.toArray(), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null
                );
            } catch(e) {
                console.error(`Compositor: Hyprland: Failed to write config file "${name}": ${(e as Error).message}`);
                console.debug(e);
            }
        });

        this.source();
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
        | "configreloaded"
        | "windowtitle"
        | "windowtitlev2"
        | "workspacev2"
        | "focusedmon"
        | "beep"
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
