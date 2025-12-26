import { monitorFile, readFile, writeFileAsync } from "ags/file";
import { Notifications } from "./notifications";
import { Accessor } from "ags";
import GObject, { getter, gtype, register } from "ags/gobject";

import Gio from "gi://Gio?version=2.0";
import AstalNotifd from "gi://AstalNotifd";
import GLib from "gi://GLib?version=2.0";


type JSONValues = string|boolean|null|number|object;
type ValueTypes = "string" | "boolean" | "object" | "number" | "any";
type SelectorOption = {
    /** this property is set at runtime, with the same zero-based index of the item in the array */
    id?: number,
    label: string,
    actionSelected?: () => void;
};
type Section = {
    title: string;
    description?: string;
    properties: Record<string, Property>;
};
type Property<T extends Config.PropertyType = Config.PropertyType.ENTRY> = {
    type: T;
    description?: string;
} & (
    T extends Config.PropertyType.ENTRY ? {
        value?: string;
        setText: (newText: string) => void;
        getText: () => string;
        subscribe?: (notify: () => void) => void;
    } : T extends Config.PropertyType.LEVEL ? {
        value: number;
        setValue: (newValue: number) => void;
        getValue: () => number;
        subscribe?: (notify: () => void) => void;
    } : T extends Config.PropertyType.SELECT ? {
        options: Array<SelectorOption>;
        /** pre-selected option by the index of the provided array */
        option: number;
        setSelection: (optionId: number) => void;
        getSelection: () => number;
        subscribe?: (notify: () => void) => void;
    } : T extends Config.PropertyType.SLIDER ? {
        maxValue: number;
        /** @default 0 */
        minValue?: number;
        setValue: (newValue: number) => void;
    } : T extends Config.PropertyType.SWITCH ? {
        state: boolean;
        getState: () => boolean;
        setState: (newState: boolean) => void;
    } : {}
);

@register({ GTypeName: "Config" })
export class Config<K extends string, V = any> extends GObject.Object {
    declare $signals: Config.SignalSignatures;

    /** unmodified object with default entries. User-values are stored 
    * in the `entries` field */
    public readonly defaults: Record<K, V>;

    @getter(gtype<Record<K, V>>(Object))
    public get entries() { return this.#entries; }

    #file: Gio.File;
    #entries: Record<K, V>;

    private timeout: (GLib.Source|boolean|undefined);

    @getter(Gio.File)
    public get file() { return this.#file; };

    constructor(
        filePath: Gio.File|string,
        defaults: Record<K, V> = {} as Record<K, V>,
        watch: boolean = true
    ) {
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
        } else {
            this.readFile(); // only read file if it already existed before
        }

        watch && monitorFile(this.#file.get_path()!, 
            () => {
                if(this.timeout) return;
                this.timeout = setTimeout(() => this.timeout = undefined, 1000);

                if(this.#file.query_exists(null)) {
                    this.timeout?.destroy();
                    this.timeout = true;

                    this.readFile();
                    this.timeout = undefined;

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

    private async writeFile(): Promise<void> {
        this.timeout = true;
        await writeFileAsync(
            this.#file.get_path()!, JSON.stringify(this.entries, undefined, 4)
        ).finally(() => this.timeout = false);
    }

    private readFile(): void {
        try {
            const content = readFile(this.#file.get_path()!)

            let newConfig: (Record<K, V>|undefined);

            try {
                newConfig = JSON.parse(content) as Record<K, V>;
            } catch(e) {
                Notifications.getDefault().sendNotification({
                    urgency: AstalNotifd.Urgency.NORMAL,
                    appName: "colorshell",
                    summary: "Config parsing error",
                    body: `An error occurred while parsing colorshell's config file: \nFile: ${
                        this.#file.get_path()!}\n${
                        (e as SyntaxError).message}`
                });

                return;
            }

            this.syncEntries(newConfig, this.#entries).catch((e: Error) => {
                Notifications.getDefault().sendNotification({
                    urgency: AstalNotifd.Urgency.NORMAL,
                    appName: "colorshell",
                    summary: "Config apply error",
                    body: `Failed to apply properties: ${e.message}`
                });
            }).finally(() => this.notify("entries"));
        } catch(e) {
            Notifications.getDefault().sendNotification({
                    urgency: AstalNotifd.Urgency.NORMAL,
                    appName: "colorshell",
                    summary: "Config read error",
                    body: `An error occurred while reading colorshell's config file: ${this.#file.get_path()!
                        }\n${(e as Error).message}`.replace(/[<>]/g, "\\&")
                });
        }
    }

    /** recursively update object properties that have been changed */
    private async syncEntries<T1 extends object, T2 extends object>(newObject: T1, targetObject: T2): Promise<void> {
        console.debug("Syncing entries for objects:\n", "new:", newObject, "\ntarget:", targetObject);
        for(const key of Object.keys(targetObject)) {
            if(newObject[key as keyof T1] === undefined) // leave unchanged if unset in user config
                continue;

            if(typeof targetObject[key as keyof T2] === "object") {
                this.syncEntries(newObject[key as keyof T1] as object, targetObject[key as keyof T2] as object);
                continue;
            }
            const newVal = newObject[key as keyof T1] as JSONValues,
                curVal = targetObject[key as keyof T2] as JSONValues;

            // check if the value changed
            if(newVal === curVal)
                continue;

            targetObject[key as keyof T2] = newObject[key as keyof T1] as never;
        }
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
            console.debug(`Config: property with path \`${path}\` not found in defaults/user-entries, returning \`undefined\``);
            property = undefined;
        }

        return property;
    }
}

export namespace Config {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify::entries": () => void;
    }
   
    export enum PropertyType {
        /** prefers using an increase/decrease type of UI */
        LEVEL = 0,
        /** prefers using an enable/disable toggle switch for the UI */
        SWITCH = 1,
        /** uses a text entry for value input */
        ENTRY = 2,
        /** prefers a selection popover to choose an option */
        SELECT = 3,
        /** use a slider for this property */
        SLIDER = 4
    }
}
