import { timeout } from "ags/time";
import { monitorFile, readFileAsync, writeFileAsync } from "ags/file";
import { Notifications } from "./notifications";
import { Accessor } from "ags";
import GObject, { getter, gtype, register } from "ags/gobject";

import Gio from "gi://Gio?version=2.0";
import AstalIO from "gi://AstalIO";
import AstalNotifd from "gi://AstalNotifd";


export { Config };
type ValueTypes = "string" | "boolean" | "object" | "number" | "any";

@register({ GTypeName: "Config" })
class Config<K extends string, V = any> extends GObject.Object {
    declare $signals: GObject.Object.SignalSignatures & {
        "notify::entries": (entries: Record<K, V>) => void;
    };

    /** unmodified object with default entries. User-values are stored 
    * in the `entries` field */
    public readonly defaults: Record<K, V>;

    @getter(gtype<Record<K, V>>(Object))
    public get entries() { return this.#entries; }

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

            this.writeFile().catch(e => Notifications.getDefault().sendNotification({
                appName: "colorshell",
                summary: "Write error",
                body: `Couldn't write default configuration file to "${this.#file.get_path()!
                    }".\nStderr: ${e}`
            }));
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

        this.readFile().catch(e => console.error(
            `Config: An error occurred while read the configuration file. Stderr: ${e}`
        ));
    }

    private async writeFile(): Promise<void> {
        this.timeout = true;
        await writeFileAsync(
            this.#file.get_path()!, JSON.stringify(this.entries, undefined, 4)
        ).finally(() => this.timeout = false);
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
                        (e as SyntaxError).message}`
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
                    body: `An error occurred while reading colorshell's config file: ${this.#file.get_path()!
                        }\n${e.message}`.replace(/[<>]/g, "\\&")
                });
        });
    }

    public bindProperty(path: string, expectType: "boolean"): Accessor<boolean>;
    public bindProperty(path: string, expectType: "number"): Accessor<number>;
    public bindProperty(path: string, expectType: "string"): Accessor<string>;
    public bindProperty(path: string, expectType: "object"): Accessor<object>;
    public bindProperty(path: string, expectType?: "any"): Accessor<any>;

    public bindProperty(propertyPath: string, expectType?: ValueTypes): Accessor<boolean|number|string|object|any> {
        return new Accessor(() => this.getProperty(propertyPath, expectType as never), (callback: () => void) => {
            const id = this.connect("notify::entries", () => callback());
            return () => this.disconnect(id);
        });
    }

    public getProperty(path: string, expectType: "boolean"): boolean;
    public getProperty(path: string, expectType: "number"): number;
    public getProperty(path: string, expectType: "string"): string;
    public getProperty(path: string, expectType: "object"): object;
    public getProperty(path: string, expectType?: "any"): any;

    public getProperty(path: string, expectType?: ValueTypes): boolean|number|string|object|any {
        return this._getProperty(path, this.#entries, expectType);
    }

    public getPropertyDefault(path: string, expectType: "boolean"): boolean;
    public getPropertyDefault(path: string, expectType: "number"): number;
    public getPropertyDefault(path: string, expectType: "string"): string;
    public getPropertyDefault(path: string, expectType: "object"): object;
    public getPropertyDefault(path: string, expectType?: "any"): any;

    public getPropertyDefault(path: string, expectType?: ValueTypes): boolean|number|string|object|any {
        return this._getProperty(path, this.defaults, expectType);
    }

    public setProperty(path: string, value: any, write?: boolean): void {
        let property: any = this.#entries,
            obj: typeof this.entries = property;
        const pathArray = path.split('.').filter(str => str);

        for(let i = 0; i < pathArray.length; i++) {
            const currentPath = pathArray[i];
            
            property = property[currentPath as keyof typeof property];
            if(typeof property === "object") {
                obj = property;
            } else {
                obj[pathArray[pathArray.length - 1] as keyof typeof obj] = value;
                break;
            }
        }

        this.notify("entries");
        write && this.writeFile().catch(e => console.error(
            `Config: Couldn't save file. Stderr: ${e}`
        ));
    }

    private _getProperty(path: string, entries: Record<K, V>, expectType?: ValueTypes): (any|undefined) {
        let property: any = entries;
        const pathArray = path.split('.').filter(str => str);

        for(let i = 0; i < pathArray.length; i++) {
            const currentPath = pathArray[i];

            property = property[currentPath as keyof typeof property];
        }

        if(expectType !== "any" && typeof property !== expectType) {
            // return default value if not defined by user
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
