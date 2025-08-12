import { timeout } from "ags/time";
import { monitorFile, readFileAsync } from "ags/file";
import { Notifications } from "./notifications";
import { encoder } from "./utils";
import { Accessor } from "ags";
import GObject, { getter, register } from "ags/gobject";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import AstalIO from "gi://AstalIO";
import AstalNotifd from "gi://AstalNotifd";


export { Config };
type ValueTypes = "string" | "boolean" | "object" | "number" | "undefined" | "any";

@register({ GTypeName: "Config" })
class Config<K extends NonNullable<string|number|symbol>, V extends string|object|any> extends GObject.Object {
    declare $signals: GObject.Object.SignalSignatures & {
        "notify::entries": (entries: Record<K, V>) => void;
    };

    /** unmodified object with default entries. User-values are stored 
    * in the `entries` field */
    public readonly defaults: Record<K, V>;

    @getter(Object)
    public get entries(): object { return this.#entries; }

    #file: Gio.File;
    #entries: Record<K, V>;

    private timeout: (AstalIO.Time|boolean|undefined);
    public get file() { return this.#file; };

    constructor(filePath: Gio.File|string, defaults?: Record<K, V>) {
        super();

        this.defaults = (defaults ?? {}) as Record<K, V>;
        this.#entries = { ...defaults } as Record<K, V>;

        this.#file = (typeof filePath === "string") ? 
            Gio.File.new_for_path(filePath)
        : filePath;

        if(!this.#file.query_exists(null)) {
            this.#file.make_directory_with_parents(null);
            this.#file.delete(null);

            this.#file.create_readwrite_async(
                Gio.FileCreateFlags.NONE, GLib.PRIORITY_DEFAULT, 
                null, (_, asyncRes) => {
                    const ioStream = this.#file.create_readwrite_finish(asyncRes);

                    ioStream.outputStream.write_bytes_async(
                        GLib.Bytes.new(encoder.encode(JSON.stringify(this.entries, undefined, 4))),
                        GLib.PRIORITY_DEFAULT, null,
                        (_, asyncRes) => {
                            const writtenBytes = ioStream.outputStream.write_bytes_finish(asyncRes);

                            if(!writtenBytes)
                                Notifications.getDefault().sendNotification({
                                    appName: "colorshell",
                                    summary: "Write error",
                                    body: `Couldn't write default configuration file to "${this.#file.get_path()!}"`
                                });
                        }
                    );
                });
        }

        monitorFile(this.#file.get_path()!, 
            () => {
                if(this.timeout) return;
                this.timeout = timeout(500, () => this.timeout = undefined);

                if(this.#file.query_exists(null)) {
                    this.timeout?.cancel();
                    this.timeout = true;

                    this.readFile().finally(() => 
                        this.timeout = undefined);

                    return;
                }

                Notifications.getDefault().sendNotification({
                    appName: "colorshell",
                    summary: "Config error",
                    body: `Could not hot-reload configuration: config file not found in \`${this.#file.get_path()!}\`, last valid configuration is being used. Maybe it got deleted?`
                });
            }
        );
    }

    private async readFile(): Promise<void> {
        await readFileAsync(this.#file.get_path()!).then((content) => {
            let config: (Record<K, V>|undefined);

            try {
                config = JSON.parse(content) as Record<K, V>;
            } catch(e) {
                Notifications.getDefault().sendNotification({
                    urgency: AstalNotifd.Urgency.NORMAL,
                    appName: "colorshell",
                    summary: "Config parsing error",
                    body: `An error occurred while parsing colorshell's config file: \nFile: ${
                        this.#file.get_path()!}\n${
                        (e as SyntaxError).message}\n${(e as SyntaxError).stack}`
                });
            }

            if(!config) return;


            // only change valid entries that are available in the defaults (with 1 of depth)
            for(const k of Object.keys(this.entries)) {
                if(config[k as keyof typeof config] === undefined) 
                    return;

                // TODO needs more work, like object-recursive(infinite depth) entry attributions
                this.#entries[k as keyof Record<K, V>] = config[k as keyof typeof config];
            }

            this.notify("entries");
        }).catch((e: Gio.IOErrorEnum) => {
            Notifications.getDefault().sendNotification({
                    urgency: AstalNotifd.Urgency.NORMAL,
                    appName: "colorshell",
                    summary: "Config read error",
                    body: `An error occurred while reading colorshell's config file: \nFile: ${`${
                        this.#file.get_path()!}\n${e.message ? `${e.message}\n` : ""}${e.stack}`.replace(/[<>]/g, "\\&")}`
                });
        });
    }

    public bindProperty(propertyPath: string, expectType?: ValueTypes): Accessor<any|undefined> {
        return new Accessor<Record<K, V>>(() => this.getProperty(propertyPath, expectType), (callback: () => void) => {
            const id = this.connect("notify::entries", () => callback());
            return () => this.disconnect(id);
        });
    }

    public getProperty(path: string, expectType?: ValueTypes): (any|undefined) {
        return this._getProperty(path, this.#entries, expectType);
    }

    public getPropertyDefault(path: string, expectType?: ValueTypes): (any|undefined) {
        return this._getProperty(path, this.defaults, expectType);
    }

    private _getProperty(path: string, entries: Record<K, V>, expectType?: ValueTypes): (any|undefined) {
        let property: any = entries;
        const pathArray = path.split('.').filter(str => str);

        for(let i = 0; i < pathArray.length; i++) {
            const currentPath = pathArray[i];

            property = property[currentPath as keyof typeof property];
        }

        if(expectType !== "any" && typeof property !== expectType) {
            console.error(`Config: property with path \`${path
                }\` is either \`undefined\` or not in the expected value type \`${expectType
                }\`, returning default value`);

            property = this.defaults;

            for(let i = 0; i < pathArray.length; i++) {
                const currentPath = pathArray[i];

                property = property[currentPath as keyof typeof property];
            }
        }

        if(expectType !== "any" && typeof property !== expectType) {
            console.error(`Config: property with path \`${path}\` not found in defaults/user-entries, returning \`undefined\``);
            property = undefined;
        }

        return property;
    }
}
