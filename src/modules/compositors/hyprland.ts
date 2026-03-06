import { Compositor } from ".";
import { register } from "ags/gobject";

import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";
import { Socket } from "../socket";
import { exec, execAsync } from "ags/process";
import Gio from "gi://Gio?version=2.0";
import { decoder, playSystemBell } from "../utils";
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

        this.initConfig();
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

            //console.log(`${event}:`, info); // debugging
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
                    this.reload();
                    return;
                }

                this.#ignoreConfigReload &&= false;
                break;

            case "bell":
                playSystemBell();
            break;
        }
    }

    private getClients(): Array<CompositorHyprland.Client> {
        return (JSON.parse(exec("hyprctl clients -j")) as Array<CompositorHyprland.Client>);
    }

    
    private source(path: string): void {
        if(!path.endsWith(".conf"))
            return;

        try {
            const out = exec(
                `hyprctl keyword source "${path}"`
            );

            !/^ok.*$/.test(out) &&
                console.error(out);
        } catch(e) {
            console.error(e);
        }
    }

    private reload(): void {
        const names = Gio.resources_enumerate_children(
            "/io/github/retrozinndev/colorshell/config/hyprland",
            null
        ).filter(name => !name.includes("bindings"));

        exec("hyprctl reload");
        names.forEach(name => this.source(`${this.#configDir.peek_path()!}/${name}`));
        this.loadBinds();
    }


    /** loads shell-specific binds from the binds.conf file packed into gresource.
      * this smartly excludes binds that the user has already set, avoiding duplicate binds */
    private loadBinds(): void {
        type Bind = { params: string, flags?: string, modmask: number, key: string };
        const bindingsConf = decoder.decode(Gio.resources_lookup_data(
            "/io/github/retrozinndev/colorshell/config/hyprland/bindings.conf",
            null
        )?.toArray());
        const bindExpr = /^bind([lrcgoenmtisdpu]*)?[ ]+=[ ]+(.*)$/;
        const binds: Array<Bind> = [];


        for(const line of bindingsConf.split('\n')) {
            if(/^#/.test(line.trim()) || /^\n$/.test(line.trim()))
                continue;

            if(!bindExpr.test(line))
                continue;

            const [, flags, params] = bindExpr.exec(line) ?? [];

            if(!params) // skip if there are no params
                continue;

            const bind = {
                params: params.replace(/, /g, ","),
                flags: flags ?? undefined,
                modmask: 0
            } as Bind;

            binds.push(bind);

            const [modkey, key] = params.split(',');
            if(modkey !== undefined) 
                bind.modmask = this.modkeyToModmask(modkey.toLowerCase());

            if(key !== undefined)
                bind.key = key.toLowerCase();
        }

        binds.forEach(bind => {
            const userBinds = AstalHyprland.get_default().get_binds();
            const match = userBinds.find(b => b.modmask === bind.modmask && 
                b.key.trim().toLowerCase() === bind.key.trim().toLowerCase()
            );

            if(match)
                return;

            // unbind just in case
            execAsync(`hyprctl keyword unbind "${bind.params.split(',').toSpliced(0, 2)}"`)
                .catch(console.error);
            execAsync(`hyprctl keyword bind${bind.flags ?? ""} "${bind.params}"`)
                .catch(console.error);
        });
    }

    /** load necessary hyprland configs from gresource */
    private initConfig(): void {
        const userLastUpdatedFile = Gio.File.new_for_path(`${this.#configDir.peek_path()!}/.last-updated`);
        const names = Gio.resources_enumerate_children(
            "/io/github/retrozinndev/colorshell/config/hyprland",
            null
        ).filter(name => !name.includes("bindings"));

        if(!this.#configDir.query_exists(null))
            this.#configDir.make_directory_with_parents(null);

        if(userLastUpdatedFile.query_exists(null)) {
            const userLastUpdated = decoder.decode(userLastUpdatedFile.read(null).read_bytes(32, null).toArray());
            const configlastUpdated = decoder.decode(Gio.resources_lookup_data(
                "/io/github/retrozinndev/colorshell/config/hyprland/.last-updated", null
            ).toArray());

            // check if data is different
            if(configlastUpdated === userLastUpdated) {
                this.reload();
                return; // no need to update, since it's unchanged/same
            }
        }

        names.forEach(name => {
            const file = Gio.File.new_for_path(`${this.#configDir.peek_path()!}/${name}`);
            const data = Gio.resources_lookup_data(
                `/io/github/retrozinndev/colorshell/config/hyprland/${name}`,
                null
            );

            try {
                file.replace_contents(data.toArray(), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            } catch(e) {
                console.error(`Compositor: Hyprland: Failed to write config file "${name}": ${(e as Error).message}`);
                console.debug(e);
            }
        });

        this.reload();
    }

    private getActiveClient(): CompositorHyprland.Client|null {
        const client = JSON.parse(exec("hyprctl -j activewindow")) as CompositorHyprland.Client|{};

        if(Object.keys(client).length === 0)
            return null;

        return client as CompositorHyprland.Client;
    }

    private modkeyToModmask(key: string): number {
        const mods = ["shift", "caps|capslock", "ctrl|control", "alt", "mod2", "mod3", "super|meta", "mod5"];
        const modmasks: Array<number> = [];

        key.split(' ').forEach((key, i) => {
            const modkeyIndex = mods.findIndex(k => k.includes(key.toLowerCase()));

            if(modkeyIndex < 0 || key.trim() === "") {
                modmasks[i] = 0;
                return;
            }

            modmasks[i] = 1 << modkeyIndex;
            console.log(key, modmasks[i]);
        });

        let mask: number|undefined = undefined;
        for(let i = 0; i < modmasks.length; i++) {
            const mm = modmasks[i];
            mask ??= mm;

            if(i === (modmasks.length-1))
                return mask !== mm ? mask : (mask | mm);

            mask = mask | mm; // we do a bitwise OR to join 'em!!
        }

        return mask ?? 0;
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
        | "bell"
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
