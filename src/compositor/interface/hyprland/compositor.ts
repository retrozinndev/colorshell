import Compositor from "../..";
import { register } from "ags/gobject";
import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";
import { Socket } from "../../../modules/socket";
import Gio from "gi://Gio?version=2.0";
import { createScopedConnection, createSubscription, encoder, playSystemBell, runtimeConfigDir } from "../../../modules/utils";
import { Wallpaper } from "../../../modules/wallpaper";
import { generalConfig } from "../../../config";
import { readFile } from "ags/file";


namespace Hyprland {
    @register({ GTypeName: "ClshCompositorHyprland" })
    export class Hyprland extends Compositor.Compositor {
        #sock: Socket;
        #eventSock: Socket;
        #configDir: Gio.File = Gio.File.new_for_path(`${runtimeConfigDir.peek_path()!}/hyprland`);
        #ignoreConfigReload: boolean = false;
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

            this.#sock = new Socket(
                Socket.Type.CLIENT,
                `${GLib.get_user_runtime_dir()}/hypr/${instSignature}/.socket.sock`
            );

            this.initConfig();

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

            // handle events from socket and others
            createScopedConnection(this.#eventSock, "received", (data: string) => {
                let [event, info] = data.split(">>", 2) as [Hyprland.Event, string|undefined];

                if(/^.*>>$/.test(event)) { // check if there are no extra data to the event
                    event = event.replace(/^(.*)>>$/, "$1") as Hyprland.Event;
                    info = undefined;
                }

                //console.log(`${event}:`, info); // debugging
                this.handleEvents(event, data);
            });

            let matchBorderColorId: number|null = null;
            createSubscription(
                generalConfig.bindProperty("misc.match_window_border_color", "boolean"),
                () => {
                    const matchBorderColor = generalConfig.getProperty("misc.match_window_border_color", "boolean");

                    if(matchBorderColorId !== null)
                        Wallpaper.getDefault().disconnect(matchBorderColorId);

                    if(matchBorderColor) {
                        matchBorderColorId = Wallpaper.getDefault().connect(
                            "colors-reloaded", () => this.reload()
                        );
                        this.reload();

                        return;
                    }

                    matchBorderColorId !== null && 
                        Wallpaper.getDefault().disconnect(matchBorderColorId);

                    this.reload();
                }
            );
        }

        private handleEvents(event: Hyprland.Event, data: string): void {
            switch(event as Hyprland.Event) {
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

        private getClients(): Array<Hyprland.Client> {
            return JSON.parse(
                this.hyprctl("clients", "json", true) ?? "[]"
            ) as Array<Hyprland.Client>;
        }
        
        private source(path: string): void {
            if(!path.endsWith(".lua"))
                return;

            try {
                const out = this.hyprctl(`eval \
local file, err = loadfile("${path}");
if file ~= nil then
    file();
else
    print(err);
end`, undefined, true);
                if(out !== null && !/^ok.*$/.test(out))
                    throw new Error(out);
            } catch(e) {
                console.error(e);
            }
        }

        private reload(): void {
            const loadHyprDecorations = generalConfig.getProperty("misc.match_window_border_color", "boolean");
            const names = Gio.resources_enumerate_children(
                "/io/github/retrozinndev/Colorshell/config/hyprland",
                Gio.ResourceLookupFlags.NONE
            );

            this.hyprctl("reload");
            for(const name of names) {
                if(name.includes("decorations") && !loadHyprDecorations)
                    return;

                this.source(`${this.#configDir.peek_path()!}/${name}`);
            }
        }

        /** load necessary hyprland configs from gresource */
        private initConfig(): void {
            const names = Gio.resources_enumerate_children(
                "/io/github/retrozinndev/Colorshell/config/hyprland",
                Gio.ResourceLookupFlags.NONE
            );

            if(!this.#configDir.query_exists(null))
                this.#configDir.make_directory_with_parents(null);

            names.forEach(name => {
                const file = Gio.File.new_for_path(`${this.#configDir.peek_path()!}/${name}`);
                const data = Gio.resources_lookup_data(
                    `/io/github/retrozinndev/Colorshell/config/hyprland/${name}`,
                    Gio.ResourceLookupFlags.NONE
                );

                try {
                    if(file.query_exists(null)) {
                        const original = GLib.compute_checksum_for_bytes(GLib.ChecksumType.SHA256, data);
                        const local = GLib.compute_checksum_for_data(GLib.ChecksumType.SHA256, encoder.encode(
                            readFile(file.peek_path()!)
                        ));

                        // check hashes
                        if(original === local)
                            return;
                    }
                } catch(e) {
                    console.error("Failed to read local hyprland runtime config.", e);
                }

                try {
                    file.replace_contents(data.toArray(), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
                } catch(e) {
                    console.error(`Compositor: Hyprland: Failed to write config file "${name}":`, e);
                }
            });

            this.reload();
        }

        private getActiveClient(): Hyprland.Client|null {
            const client = JSON.parse(
                this.hyprctl("activewindow", "json", true) ?? "{}"
            ) as Hyprland.Client;

            if(Object.keys(client).length === 0)
                return null;

            return client as Hyprland.Client;
        }

        /** send a hyprctl `command` with optional `args`
         * @param wait whether to wait for a response from hyprctl(socket) */
        public hyprctl(command: string, args?: string, wait: boolean = false): string|null {
            if(wait)
                return this.#sock.simpleSendSync(`${args ?? ""}/${command}`);

            this.#sock.sendSync(`${args ?? ""}/${command}`).close(null);
            return null;
        }

        /** asynchronous version of `CompositorHyprland.hyprctl()`
          * WARNING: this is currently not behaving correctly!
          * ---
          * send a hyprctl `command` with optional `args`.
          * @param wait whether to wait for a response from hyprctl(socket) */
        public async hyprctlAsync(command: string, args?: string, wait: boolean = false): Promise<string|null> {
            if(wait)
                return await this.#sock.simpleSend(`${args ?? ""}/${command}`);

            (await this.#sock.send(`${args ?? ""}/${command}`)).close(null);
            return null;
        }
    }


    export type Event = keyof Events;
    export type Bind = {
        params: string;
        flags?: string;
        modmask: number;
        key: string;
    };

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
    
    export type Events = {
        workspace: [string];
        workspacev2: [number, string];
        focusedmon: [string, string];
        focusedmonv2: [string, number];
        activewindow: [string, string];
        activewindowv2: [string];
        fullscreen: [number];
        monitorremoved: [string];
        monitorremovedv2: [number, string, string];
        monitoradded: [string];
        monitoraddedv2: [number, string, string];
        createworkspace: [string];
        createworkspacev2: [number, string];
        destroyworkspace: [string];
        destroyworkspacev2: [number, string];
        moveworkspace: [string, string];
        moveworkspacev2: [number, string, string];
        renameworkspace: [number, string];
        activespecial: [string, string];
        activespecialv2: [number, string, string];
        activelayout: [string, string];
        openwindow: [string, string, string, string];
        closewindow: [string];
        kill: [string];
        movewindow: [string, string];
        movewindowv2: [string, number, string];
        openlayer: [string];
        closelayer: [string];
        submap: [string];
        changefloatingmode: [string, 0|1];
        urgent: [string];
        screencast: [0|1, 0|1];
        windowtitle: [string];
        windowtitlev2: [string, string];
        togglegroup: [0|1, ...string[]];
        moveintogroup: [string];
        moveoutofgroup: [string];
        ignoregrouplock: [0|1];
        lockgroups: [0|1];
        configreloaded: undefined;
        pin: [string, any]; // TODO: discover what the hell is PINSTATE
        minimized: [string, 0|1];
        bell: [string];
    };
}

export default Hyprland;
