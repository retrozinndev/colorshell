import { exec, execAsync } from "ags/process";
import { isInstalled } from "./utils";
import { readFile } from "ags/file";
import GObject, { getter, register, signal } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


/** Cliphist Manager and clipboard event listener */
@register({ GTypeName: "Clipboard" })
class Clipboard extends GObject.Object {
    private static instance: Clipboard|null = null;

    #db!: Gio.File;
    #monitor!: [Gio.FileMonitor, number];
    #procs: Array<Gio.Subprocess> = [];
    #history: Array<Clipboard.Item> = [];

    @signal(Object) copied(_: Clipboard.Item) {}
    @signal(Object) removed(_: Clipboard.Item) {}
    @signal() wiped() {};

    /** last-to-first list of clipboard items */
    @getter(Array)
    public get history() { return [...this.#history]; }


    constructor() {
        super();

        if(!isInstalled("cliphist")) {
            console.warn("Clipboard: cliphist doesn't seem to be installed; clipboard features may not work");
            return;
        }

        this.#procs.push(
            Gio.Subprocess.new(
                ["wl-paste", "--type", "text", "--watch", "cliphist store"],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            ),
            Gio.Subprocess.new(
                ["wl-paste", "--type", "image", "--watch", "cliphist store"],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            )
        );

        this.#db = this.getCliphistDatabase();
        const monitor = this.#db.monitor_file(Gio.FileMonitorFlags.NONE, null);
        this.#monitor = [monitor, monitor.connect("changed", (_, file) => {
            if(!file.query_exists(null)) {
                this.wipe(true);
                return;
            }

            this.readDatabase().catch(console.error);
        })];

        this.readDatabase().catch(console.error);
    }

    public static init(): Clipboard {
        if(!this.instance)
            this.instance = new Clipboard();

        return this.instance;
    }

    public static deinit(): void {
        if(!this.instance)
            return;

        this.instance.#monitor?.[0].disconnect(this.instance.#monitor[1]);
        this.instance.#procs.splice(0, this.instance.#procs.length)
            .forEach(p => p.force_exit());
        this.instance.#history.splice(0, this.instance.#history.length);
        this.instance = null;
    }

    public static getDefault(): Clipboard {
        return this.init();
    }

    /** store item in cliphist database */
    protected async store(data: string): Promise<void> {
        await execAsync(["cliphist", "store", data]);
    }

    /** store item in cliphist database. synchronously. */
    protected storeSync(data: string): void {
        exec(["cliphist", "store", data]);
    }

    /** Searches for the cliphist database file 
      * Will not work if cliphist config file is not on default path */
    private getCliphistDatabase(): Gio.File {
        // Check if env variable is set
        const path = GLib.getenv("CLIPHIST_DB_PATH");
        if(path != null) 
            return Gio.File.new_for_path(path);

        // Check config file
        const confFile = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/cliphist/config`);
        if(confFile.query_exists(null)) {
            const cliphistConf = readFile(confFile.get_path()!);
            for(const line of cliphistConf.split('\n').map(l => l.trim())) {
                if(line.startsWith('#'))
                    continue;

                const [ key, value ] = line.split('\s', 1);
                if(key === "db-path") {
                    return Gio.File.new_for_path(value.trimStart());
                }
            }
        }

        // return default path if none of the above matches
        return Gio.File.new_for_path(`${GLib.get_user_cache_dir()}/cliphist/db`);
    }

    /** add item to the clipboard history.
      * use `Clipboard.store` to actually store data inside of the cliphist database */
    protected add(type: Clipboard.Item.Type, data?: string): void {
        const lastId = (this.#history[0]?.id ?? 0);
        const preview = type === Clipboard.Item.Type.IMAGE ?
            "[[ binary data ]]"
        : data?.substring(0, 24) ?? "<unknown text>";
        const item: Clipboard.Item = { type, data, preview, id: lastId+1 };

        this.#history.unshift(item);
        this.emit("copied", item);
        this.notify("history");
    }

    /** remove item from history.
      * @param item identifier for the `ClipboardItem` to remove or the item itself
      * @returns `true` if removed sucessfully, `false` otherwise */
    protected remove(item: number|Clipboard.Item): boolean {
        item = typeof item === "object" && assert("id" in item) ? item.id : item;

        const i = this.#history.findIndex(i => i.id === item);
        if(i < 0)
            return false;

        exec(`cliphist delete-query ${item}`);
        this.emit("removed", this.#history.splice(i, 1)[0]);
        this.notify("history");
        return true;
    }

    public async copy(item: string|Clipboard.Item): Promise<boolean> {
        if(typeof item === "object") {
            assert("type" in item, "id" in item);
            
            try {
                await this.copy("data" in item ?
                    item.data!
                : (await this.getItemContent(item))!);
            } catch(e) {
                console.error(e);
                return false;
            }

            return true;
        }

        const proc = Gio.Subprocess.new(
            ["wl-copy", item],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
        Gio._promisify(proc, "wait_check_async", "wait_check_finish");

        return await proc.wait_check_async(null);;
    }

    /** Gets history item's content by its ID.
        * @returns the clipboard item's content */
    public async getItemContent(item: number|Clipboard.Item): Promise<string|undefined> {
        item = typeof item === "object" ? item.id : item;

        const cmd = Gio.Subprocess.new([ "cliphist", "decode", item.toString() ], 
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

        const [ , stdout, stderr ] = cmd.communicate_utf8(null, null);

        if(stderr) {
            console.error("Clipboard: An error occurred while getting item content:", stderr);
            return;
        }

        return stdout;
    }

    private getItemType(preview: string): Clipboard.Item.Type {
        return /^\[\[ binary data (.* )?\]\]$/.test(preview) ?
            Clipboard.Item.Type.IMAGE
        : Clipboard.Item.Type.TEXT;
    }

    /** wipes clipboard history.
      * @param skipDB skips wiping the database (only wipes the internal list) */
    public async wipe(skipDB: boolean = false): Promise<void> {
        if(skipDB) {
            this.#history.splice(0, this.#history.length);
            this.emit("wiped");

            return;
        }

        try {
            await execAsync("cliphist wipe");
            this.#history.splice(0, this.#history.length);
            this.emit("wiped");
        } catch(err) {
            console.error("Clipboard: An error occurred on cliphist database wipe:", err);
        }
    }

    public async readDatabase(): Promise<void> {
        const proc = Gio.Subprocess.new(
            [ "cliphist", "list" ],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        Gio._promisify(proc, "communicate_utf8_async", "communicate_utf8_finish");
        let stdout: string|undefined;

        try {
            stdout = (await proc.communicate_utf8_async(null, null))[0];
        } catch(e) {
            console.error("Clipboard: Couldn't read cliphist history! Is it installed?");
            return;
        }


        if(stdout?.trim() === "") {
            this.wipe(true);
            this.notify("history");
            return;
        }
            
        const items = stdout.split('\n');

        for(let i = items.length-1; i >= 0; i--) {
            const item = items[i];

            if(item.trim() === "")
                continue;

            const [ idStr, preview ] = item.split('\t');
            const id = Number.parseInt(idStr);

            if(i === items.length && this.#history[0]?.id === id)
                break;

            if(this.#history.findIndex(i => i.id === id) > -1)
                continue;

            const clipItem = {
                id, preview, type: this.getItemType(preview)
            } as Clipboard.Item;

            this.#history.unshift(clipItem);
            this.emit("copied", clipItem);
            this.notify("history");
        }
    }
}

namespace Clipboard {   
    export type Item = {
        id: number;
        type: Item.Type;
        preview: string;
        data?: string;
    };

    export namespace Item {
        export enum Type {
            TEXT = 0,
            IMAGE = 1
        }
    }

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "copied": (item: Clipboard.Item) => void;
        "wiped": () => void;
    }
}


export default Clipboard;
