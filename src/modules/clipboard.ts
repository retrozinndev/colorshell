import { monitorFile, readFile } from "ags/file"; 
import { execAsync } from "ags/process";
import GObject, { getter, register, signal } from "ags/gobject";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


// TODO: better history monitoring
/** Cliphist Manager and event listener
  * This only supports wipe and store events from cliphist */
@register({ GTypeName: "Clipboard" })
class Clipboard extends GObject.Object {
    private static instance: Clipboard;

    #dbFile: Gio.File;
    #dbMonitor: Gio.FileMonitor;
    #updateDone: boolean = false;
    #history = new Array<Clipboard.Item>;
    #changesTimeout?: GLib.Source;
    #ignoreChanges: boolean = false;
    #procs: Array<Gio.Subprocess> = [];

    @signal(GObject.TYPE_JSOBJECT) copied(_item: object) {}
    @signal() wiped() {};

    @getter(Array)
    public get history() { return this.#history; }


    constructor() {
        super();

        this.#procs = [
            Gio.Subprocess.new(
                ["wl-paste", "--type", "text", "--watch", "cliphist", "store"],
                Gio.SubprocessFlags.STDOUT_SILENCE
            ),
            Gio.Subprocess.new(
                ["wl-paste", "--type", "image", "--watch", "cliphist", "store"],
                Gio.SubprocessFlags.STDOUT_SILENCE
            )
        ];

        this.#dbFile = this.getCliphistDatabase();

        this.#dbMonitor = monitorFile(this.#dbFile.get_path()!, () => {
            if(this.#ignoreChanges || this.#changesTimeout) 
                return;

            this.#changesTimeout = setTimeout(() => this.#changesTimeout = undefined, 300);
            
            if(this.#updateDone) {
                this.updateDatabase();
                return;
            }

            this.init();
        });

        if(this.#dbFile.query_exists(null)) {
            this.init();
            return;
        }

        console.log("Clipboard: cliphist database not found. Try copying something first!");
    }

    private init() {
        console.log("Clipboard: Starting to read cliphist history...");

        this.updateDatabase().then(() => {
            console.log("Clipboard: Done reading cliphist history!");
        }).catch((err) => 
            console.error(`Clipboard: An error occurred while reading cliphist history. Stderr: ${err}`)
        );
    }

    public async copyAsync(content: string): Promise<boolean> {
        const proc = Gio.Subprocess.new(
            ["wl-copy", content],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        const stderr = Gio.DataInputStream.new(proc.get_stderr_pipe()!);

        if(!proc.wait_check(null)) {
            try {
                const [err, ] = stderr.read_upto('\x00', -1, null);
                console.error(`Clipboard: An error occurred while copying text. Stderr: ${err}`);
            } catch(_) {
                console.error(`Clipboard: An error occurred while copying text and shell couldn't read \
stderr for more info.`);
            }
        }

        return proc.get_exit_status() === 0;
    }

    public async selectItem(itemToSelect: number|Clipboard.Item): Promise<boolean> {
        const item = await this.getItemContent(itemToSelect);
        let res: boolean = true;

        if(item) 
            await this.copyAsync(item).catch(() => res = false);

        return res;
    }

    /** Gets history item's content by its ID.
        * @returns the clipboard item's content */
    public async getItemContent(item: number|Clipboard.Item): Promise<string|undefined> {
        const id = (typeof item === "number") ?
            item : item.id;

        const cmd = Gio.Subprocess.new([ "cliphist", "decode", id.toString() ], 
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

        const [ , stdout, stderr ] = cmd.communicate_utf8(null, null);

        if(stderr) {
            console.error(`Clipboard: An error occurred while getting item content. Stderr:\n${stderr}`);
            return;
        }

        return stdout;
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

    private getContentType(preview: string): Clipboard.ItemType {
        return /^\[\[.*binary data.*x.*\]\]$/u.test(preview) ?
            Clipboard.ItemType.IMAGE
        : Clipboard.ItemType.TEXT;
    }

    public async wipeHistory(noExec?: boolean): Promise<void> {
        if(noExec) {
            this.#history = [];
            this.emit("wiped");
            return;
        }

        this.#ignoreChanges = true;
        await execAsync("cliphist wipe").then(() => {
            this.#history = [];
            this.emit("wiped");
        }).catch((err: Gio.IOErrorEnum) => 
            console.error(`Clipboard: An error occurred on cliphist database wipe. Stderr: ${
                err.message ? `${err.message}\n` : ""}${err.stack}`)
        ).finally(() => this.#ignoreChanges = false);
    }

    public async updateDatabase(): Promise<void> {
        const proc = Gio.Subprocess.new([ "cliphist", "list" ],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

        proc.communicate_utf8_async(null, null, (_, asyncRes) => {
            const [ success, stdout, stderr ] = proc.communicate_utf8_finish(asyncRes);

            if(!success || stderr) {
                console.error("Clipboard: Couldn't communicate with cliphist! Is it installed?");
                return;
            }

            if(!stdout.trim()) {
                this.wipeHistory(true);
                this.notify("history");
                return;
            }
            
            const items = stdout.split('\n');

            if(this.#updateDone) {
                const [ id, preview ] = items[0].split('\t');
                const clipItem = {
                    id: Number.parseInt(id),
                    preview,
                    type: this.getContentType(preview)
                } as Clipboard.Item;
                
                this.#history.unshift(clipItem);

                this.emit("copied", clipItem);
                this.notify("history");
                return;
            }

            for(const item of items) {
                if(!item) continue;

                const [ id, preview ] = item.split('\t');

                const clipItem = {
                    id: Number.parseInt(id),
                    preview,
                    type: this.getContentType(preview)
                } as Clipboard.Item;

                this.#history.push(clipItem);

                this.emit("copied", clipItem);
                this.notify("history");
            }

            this.#updateDone = true;

        });
    }

    public static getDefault(): Clipboard {
        if(!this.instance)
            this.instance = new Clipboard();

        return this.instance;
    }
}

namespace Clipboard {   
    export enum ItemType {
        TEXT = 0,
        IMAGE = 1
    }

    export class Item {
        id: number;
        type: ItemType;
        preview: string;

        constructor(id: number, type: ItemType, preview: string) {
            this.id = id;
            this.type = type;
            this.preview = preview;
        }
    }

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "copied": (item: Clipboard.Item) => void;
        "wiped": () => void;
    }
}

export default Clipboard;
