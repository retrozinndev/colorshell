import { AstalIO, Gio, GLib, GObject, monitorFile, readFileAsync, register, timeout } from "astal";
import Binding, { bind, Subscribable } from "astal/binding";
import { Notifications } from "./notifications";
import AstalNotifd from "gi://AstalNotifd";
import { encoder } from "./utils";


export { Config };

export type ConfigEntries = Partial<{
    workspaces: Partial<{
        /** this is the function that shows the Workspace's IDs 
        * around the current workspace if one breaks the crescent order.
        * It basically helps keyboard navigation between workspaces.
        * ---
        * Example: 1(empty, current, shows ID), 2(empty, does not appear(makes 
        * the previous not to be in a crescent order)), 3(not empty, shows ID) */
        enable_helper: boolean;
        /** breaks `enable_helper`, makes all workspaces show their respective ID 
        * by default */
        always_show_id: boolean;
    }>;

    clock: Partial<{
        /** use the same formats as gnu's `date` command */
        date_format: string;
    }>;

    notifications: Partial<{
        timeout_low: number;
        timeout_normal: number;
        timeout_critical: number;
    }>;

    night_light: Partial<{
        /** whether to save night light values to disk */
        save_on_shutdown: boolean;
    }>;
}>;

type ValueTypes = "string" | "boolean" | "object" | "number" | "undefined" | "any";


@register({ GTypeName: "Config" })
class Config extends GObject.Object implements Subscribable {
    private static instance: Config;

    private readonly defaultFile = Gio.File.new_for_path(
        `${GLib.get_user_config_dir()}/colorshell/config.json`);

    /** unmodified object with default entries. User-values are stored 
    * in the `entries` field */
    public readonly defaults: ConfigEntries = {
        notifications: {
            timeout_low: 4000,
            timeout_normal: 6000,
            timeout_critical: 0
        },

        night_light: {
            save_on_shutdown: true
        },

        workspaces: {
            always_show_id: false,
            enable_helper: true
        },

        clock: {
            date_format: "%A %d, %H:%M"
        }
    };

    private readonly entries: ConfigEntries = this.defaults;


    #subs: Set<(entries: ConfigEntries) => void> = new Set();
    #file: Gio.File;
    private timeout: (AstalIO.Time|boolean|undefined);
    public get file() { return this.#file; };

    constructor(filePath?: (Gio.File|string)) {
        super();

        this.#file = (typeof filePath === "string") ? 
            Gio.File.new_for_path(filePath)
        : (filePath ?? this.defaultFile);

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

    public static getDefault(): Config {
        if(!this.instance)
            this.instance = new Config();

        return this.instance;
    }

    private async readFile(): Promise<void> {
        await readFileAsync(this.#file.get_path()!).then((content) => {
            let config: (ConfigEntries|undefined);

            try {
                config = JSON.parse(content) as ConfigEntries;
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
                this.entries[k as keyof typeof this.entries] = config[k as keyof typeof config];
            }

            this.notifySubs();
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

    private notifySubs(): void {
        for(const sub of this.#subs) {
            sub(this.entries);
        }
    }

    public bindProperty(propertyPath: (keyof ConfigEntries|string), expectType?: ValueTypes): Binding<any|undefined> {
        return bind(this).as(() => 
            this.getProperty(propertyPath, expectType));
    }

    public getProperty(path: string, expectType?: ValueTypes): (any|undefined) {
        return this._getProperty(path, this.entries, expectType);
    }

    public getPropertyDefault(path: string, expectType?: ValueTypes): (any|undefined) {
        return this._getProperty(path, this.defaults, expectType);
    }

    private _getProperty(path: string, entries: ConfigEntries, expectType?: ValueTypes): (any|undefined) {
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

    public get(): ConfigEntries {
        return this.entries;
    }

    public subscribe(callback: (entries: ConfigEntries) => void): () => void {
        this.#subs.add(callback);

        return () => {
            this.#subs.delete(callback);
        };
    }
}
