import Compositor from "../..";
import { Gtk } from "ags/gtk4";
import { register } from "ags/gobject";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { createScopedConnection, createSubscription, encoder, runtimeConfigDir } from "../../../modules/utils";
import { generalConfig } from "../../../config";
import { readFile } from "ags/file";
import Socket from "../../../modules/socket";
import Client from "./client";
import StyleManager from "../../../modules/stylemanager";


@register({ GTypeName: "ClshCompositorHyprland" })
class Hyprland extends Compositor.Compositor {
    declare $signals: Compositor.Compositor.SignalSignatures;
    #sock: Socket;
    #inst: AstalHyprland.Hyprland;
    #configDir: Gio.File = Gio.File.new_for_path(`${runtimeConfigDir.peek_path()!}/hyprland`);
    #ignoreConfigReload: boolean = false;


    constructor() {
        super();
        this.#inst = AstalHyprland.get_default();
        this.#sock = new Socket(
            Socket.Type.CLIENT,
            `${GLib.get_user_runtime_dir()}/hypr/${GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")}/.socket.sock`,
            false
        );

        this.initConfig();

        createScopedConnection(this.#inst, "event", (e, dat) => this.handleEvents(e, dat));

        for(const c of this.#inst.get_clients()) {
            const client = new Client(c);
            this._clients.push(client);
        }
        this._focusedClient = this._clients.find(c =>
            c.address === this.#inst.get_focused_client()?.get_address()
        ) ?? null;

        createScopedConnection(this.#inst, "client-added", (c) => {
            const client = new Client(c);
            this._clients.push(client);
            this.notify("clients");
            (this as Hyprland).emit("client-added", client);
        });
        createScopedConnection(this.#inst, "client-removed", (addr) => {
            const i = this._clients.findIndex(cl => cl.address === addr);

            (this as Hyprland).emit("client-removed", this._clients.splice(i, 1)[0]);
            this.notify("clients");
        });
        // TODO support workspaces

        let matchBorderColorId: number|null = null;
        createSubscription(
            generalConfig.bindProperty("misc.match_window_border_color", "boolean"),
            () => {
                const matchBorderColor = generalConfig.getProperty("misc.match_window_border_color", "boolean");

                if(matchBorderColorId !== null)
                    StyleManager.getDefault().disconnect(matchBorderColorId);

                if(matchBorderColor) {
                    matchBorderColorId = StyleManager.getDefault().connect(
                        "colors-reloaded", () => this.reload()
                    );
                    this.reload();

                    return;
                }

                matchBorderColorId !== null && 
                    StyleManager.getDefault().disconnect(matchBorderColorId);

                this.reload();
            }
        );
    }

    private handleEvents(event: string, data: string): void {
        switch(event as Hyprland.Event) {
            case "activewindowv2": // we handle this manually cuz astal does a terrible job with this property
                const address = data;
                const focusedClient = this._clients.find(cl => cl.address === address);

                this._focusedClient = focusedClient ?? null;
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
                this.bell().catch(console.error);
            break;
        }
    }

    private source(path: string): void {
        if(!path.endsWith(".lua"))
            return;

        try {
            const out = this.#sock.simpleSendSync(`eval \
local file, err = loadfile("${path}");
if file ~= nil then
    file();
else
    print(err);
end`);
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

        this.#sock.simpleSendSync("reload");
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

    public hyprctl(cmd: string, flags?: string): string|null {
        return this.#sock.simpleSendSync(`${flags !== undefined ? `${flags}/` : ""}${cmd}`);
    }

    protected async bell(): Promise<void> {
        const file = Gio.File.new_for_path("/usr/share/sounds/freedesktop/stereo/bell.oga");

        if(!file.query_exists(null))
            return;


        const media = Gtk.MediaFile.new();
        media.set_file(file);
        media.play();
    }
}


namespace Hyprland {
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
