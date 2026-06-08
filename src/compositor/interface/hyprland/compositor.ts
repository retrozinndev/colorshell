import Compositor from "../..";
import { Gtk } from "ags/gtk4";
import { register } from "ags/gobject";
import AstalHyprland from "gi://AstalHyprland";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { createScopedConnection, encoder, runtimeConfigDir } from "../../../modules/utils";
import { generalConfig } from "../../../config";
import { readFile } from "ags/file";
import Socket from "../../../modules/socket";
import Client from "./client";
import Workspace from "./workspace";
import Monitor from "./monitor";
import { exec } from "ags/process";
import StyleManager from "../../../modules/stylemanager";


@register({ GTypeName: "ClshHyprland" })
class Hyprland extends Compositor.Compositor {
    declare $signals: Compositor.Compositor.SignalSignatures;
    #sock: Socket;
    #inst: AstalHyprland.Hyprland;
    #configDir: Gio.File = Gio.File.new_for_path(`${runtimeConfigDir.peek_path()!}/hyprland`);
    #ignoreConfigReload: boolean = false;
    #configProvider: Hyprland.ConfigProvider = Hyprland.ConfigProvider.HYPRLANG;

    get configProvider(): Hyprland.ConfigProvider {
        return this.#configProvider;
    }

    constructor() {
        super();
        this.#inst = AstalHyprland.get_default();
        this.#sock = new Socket(
            Socket.Type.CLIENT,
            `${GLib.get_user_runtime_dir()}/hypr/${GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")}/.socket.sock`,
            false
        );

        try {
            const prov: "lua"|"hyprlang" = JSON.parse(exec("hyprctl status -j")).configProvider;
            if(prov === "lua")
                this.#configProvider = Hyprland.ConfigProvider.LUA;
        } catch(_) {}

        this.initConfig();

        createScopedConnection(this.#inst, "event", (e, dat) => this.handleEvents(e, dat));

        // monitors
        for(const mon of this.#inst.get_monitors()) {
            const monitor = new Monitor(this, mon);
            this._monitors.push(monitor);
        }
        // workspaces
        for(const w of this.#inst.get_workspaces()) {
            const workspace = new Workspace(this, w);
            this._workspaces.push(workspace);
        }
        this._focusedWorkspace = this.workspaces.find(ws =>
            ws.id === this.#inst.get_focused_workspace().get_id()
        ) ?? null;
        // clients
        for(const c of this.#inst.get_clients()) {
            const client = new Client(this, c);
            this._clients.push(client);

            (client.workspace as Workspace)?.syncClients();
            (client.workspace as Workspace)?.syncLastFocusedClient();
        }
        this._focusedClient = this._clients.find(c =>
            c.address === this.#inst.get_focused_client()?.get_address()
        ) ?? null;

        createScopedConnection(this.#inst, "client-added", (c) => {
            if(this._clients.findIndex(cl => cl.address === c.address) > -1)
                return;

            const client = new Client(this, c);
            this._clients.push(client);
            (client.workspace as Workspace)?.syncLastFocusedClient();
            this.notify("clients");
            this.emit("client-added", this);
        });
        createScopedConnection(this.#inst, "client-removed", (addr) => {
            const i = this._clients.findIndex(cl => cl.address === addr);
            const client = this._clients.splice(i, 1)[0];

            (client as Client).dispose();
            this.emit("client-removed", client);
            this.notify("clients");
        });

        createScopedConnection(this.#inst, "workspace-added", (ws) => {
            if(this._workspaces.findIndex(w => w.id === ws.id) > -1)
                return;

            const workspace = new Workspace(this, ws);

            this._workspaces.push(workspace);
            this.notify("workspaces");
            this.emit("workspace-added", ws);
        });
        createScopedConnection(this.#inst, "workspace-removed", (id) => {
            const i = this._workspaces.findIndex(w => w.id === id);
            const workspace = this._workspaces.splice(i, 1)[0];

            (workspace as Workspace).dispose();
            this.emit("workspace-removed", workspace);
            this.notify("workspaces");
        });
        createScopedConnection(this.#inst, "notify::focused-workspace", () => {
            const focused = this.#inst.get_focused_workspace();

            if(!focused) {
                this._focusedWorkspace &&= null;
                this.notify("focused-workspace");
                return;
            }

            this._focusedWorkspace = this.workspaces.find(ws =>
                ws.id === focused.get_id()
            )!;
            this.notify("focused-workspace");
        });

        createScopedConnection(this.#inst, "monitor-added", (mon) => {
            if(this._monitors.findIndex(m => m.id === mon.id) > -1)
                return;

            const monitor = new Monitor(this, mon);

            this._monitors.push(monitor);
            this.notify("monitors");
            this.emit("monitor-added", monitor);
        });
        createScopedConnection(this.#inst, "monitor-removed", (id) => {
            const i = this._monitors.findIndex(m => m.id === id);
            const monitor = this._monitors.splice(i, 1)[0];

            (monitor as Monitor).dispose();
            this.notify("monitors");
            this.emit("monitor-removed", monitor);
        });

        createScopedConnection(StyleManager.getDefault(), "colors-reloaded", () => {
            const matchBorderColor = generalConfig.getProperty("misc.match_window_border_color", "boolean");

            if(!matchBorderColor)
                return;

            this.reload();
        });
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

    /** send a message to the hyprland socket */
    protected message(msg: string): string|null {
        return this.#sock.simpleSendSync(msg);
    }

    private source(path: string): void {
        if(!/\.(lua|conf)$/.test(path))
            return;

        try {
            let out: string|null = null;
            if(this.configProvider === Hyprland.ConfigProvider.LUA) {
                out = this.message(`eval \
local file, err = loadfile("${path}");
if file ~= nil then
    file();
else
    print(err);
end`);
            } else {
                out = this.message(`keyword source ${path}`);
            }

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
        ).filter(f => this.configProvider === Hyprland.ConfigProvider.LUA ?
            f.endsWith(".lua")
        : f.endsWith(".conf"));

        this.message("reload");
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
        ).filter(f => this.configProvider === Hyprland.ConfigProvider.LUA ?
            f.endsWith(".lua")
        : f.endsWith(".conf"));

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
        return this.message(`${flags !== undefined ? `${flags}/` : ""}${cmd}`);
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

    export enum ConfigProvider {
        HYPRLANG = 0,
        LUA = 1
    }
}

export default Hyprland;
