import { createPoll } from "ags/time";
import { exec, execAsync } from "ags/process";
import { Astal, Gtk } from "ags/gtk4";
import { getSymbolicIcon } from "./apps";
export {
    toBoolean as variableToBoolean, 
    construct, 
    transform,
    transformWidget,
    createSubscription,
    createAccessorBinding as baseBinding,
    createScopedConnection,
    createSecureBinding as secureBinding,
    createSecureAccessorBinding as secureBaseBinding,
} from "gnim-utils";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import { Notifications } from "./notifications";

Gio._promisify(Gio.DBus, "get", "get_finish");
Gio._promisify(Gio.DBusProxy, "new", "new_finish");
Gio._promisify(Gio.DBusConnection.prototype, "call", "call_finish");

export const decoder = new TextDecoder("utf-8"),
    encoder = new TextEncoder();
export const time = createPoll(GLib.DateTime.new_now_local(), 500, () => 
    GLib.DateTime.new_now_local());

export function getHyprlandInstanceSig(): (string|null) {
    return GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
}

export function getHyprlandVersion(): string {
    return exec(`${GLib.getenv("HYPRLAND_CMD") ?? "Hyprland"} --version | head -n1`).split(" ")[1];
}

export function getPlayerIconFromBusName(busName: string): string {
    const splitName = busName.split('.').filter(str => str !== "" && 
        !str.toLowerCase().includes('instance'));

    return getSymbolicIcon(splitName[splitName.length - 1]) ?
        getSymbolicIcon(splitName[splitName.length - 1])!
    : "folder-music-symbolic";
}

export function escapeUnintendedMarkup(input: string): string {
    return input.replace(/<[^>]*>|[<>&"]/g, (s) => {
        if(s.startsWith('<') && s.endsWith('>'))
            return s;

        switch(s) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "\"": return "&quot;";
        }

        return s;
    });
}

export function escapeSpecialCharacters(str: string): string {
    return str.replace(/[\\^$.*?()[\]{}|]/g, "\\$&");
}

/** translate paths with environment variables in it to absolute paths */
export function translateDirWithEnvironment(path: string): string {
    path = path.replace(/^[~]/, GLib.get_home_dir());

    return path.split('/').map(part => /^\$/.test(part) ?
        GLib.getenv(part.replace(/^\$/, "")) ?? part
    : part).join('/');
}

export function getChildren(widget: Gtk.Widget): Array<Gtk.Widget> {
    const firstChild = widget.get_first_child(), 
        children: Array<Gtk.Widget> = [];
    if(!firstChild) return [];

    let currentChild = firstChild.get_next_sibling();
    while(currentChild != null) {
        children.push(currentChild);
        currentChild = currentChild.get_next_sibling();
    }

    return children;
}

/** search for a process by its name. (exact match)
  * @returns the pid for the first search result, `undefined` if no process was found */
export function getPID(search: string): number|undefined {
    let result!: string;

    try {
        result = exec(`pgrep -x "${search}"`).trim().replaceAll('\n', '');
    } catch(e) {
        return undefined;
    }

    const pid = Number.parseInt(result);

    if(!isNaN(pid))
        return pid;

    return undefined;
}

/** asynchronously get the PID(Process ID) for a DBus name
  * @param name the bus name you want to get the PID of 
  * @param objectPath the object path of `name`
  * @param iface the interface for `name` 
  *
  * @returns a `number` indicating the process ID, or a broken promise if an error occurred */
export async function getDBusNamePID(name: string, objectPath: string, iface: string): Promise<number> {
    const session = await (Gio.DBus.get(Gio.BusType.SESSION, null) as unknown as Promise<Gio.DBusConnection>);
    const proxy = await (Gio.DBusProxy.new(
        session,
        Gio.DBusProxyFlags.NONE,
        null,
        name,
        objectPath,
        iface,
        null
    ) as unknown as Promise<Gio.DBusProxy>);

    const owner = proxy.get_name_owner();

    if(!owner)
        throw new Error("DBus: Couldn't get name owner to retrieve PID");

    const params = GLib.Variant.new("(s)", [owner]);

    const pidVariant: GLib.Variant<"(u)"> = await session.call(
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "GetConnectionUnixProcessID",
        params,
        GLib.VariantType.new("(u)"),
        Gio.DBusCallFlags.NONE,
        300,
        null
    );

    if(!pidVariant)
        throw new Error("DBus: call to org.freedesktop.DBus.GetConnectionUnixProcessID returned a nullish value");

    return pidVariant.get_child_value(0).get_uint32();
}

/** forces a process to quit with the desired signal. 
  * @param pid the process id
  * @param signal process signal code. default: `2` */
export function killProc(pid: number, signal: number = 2): boolean {
    try {
        exec(`kill -s ${signal} ${pid}`);
    } catch(_) {
        return false;
    }

    return true;
}

export function omitObjectKeys<ObjT = object>(obj: ObjT, keys: keyof ObjT|Array<keyof ObjT>): object {
    const finalObject = { ...obj };

    for(const objKey of Object.keys(finalObject as object)) {
        if(!Array.isArray(keys)) {
            if(objKey === keys) {
                delete finalObject[keys as keyof typeof finalObject];
                break;
            }

            continue;
        }

        for(const omitKey of keys) {
            if(objKey === omitKey) {
                delete finalObject[objKey as keyof typeof finalObject];
                break;
            }
        }
    }

    return finalObject as object;
}

export function pickObjectKeys<ObjT = object>(obj: ObjT, keys: Array<keyof ObjT>): object {
    const finalObject = {} as Record<keyof ObjT, any>;

    for(const key of keys) {
        for(const objKey of Object.keys(obj as object)) {
            if(key === objKey) {
                finalObject[key as keyof ObjT] = obj[objKey as keyof ObjT];
                break;
            }
        }
    }

    return finalObject;
}

export function pathToURI(path: string): string {
    switch(true) {
        case (/^[/]/).test(path): 
            return `file://${path}`;

        case (/^[~]/).test(path):
        case (/^file:\/\/[~]/i).test(path):
            return `file://${GLib.get_home_dir()}/${path.replace(/^(file\:\/\/|[~]|file\:\/\[~])/i, "")}`;
    }

    return path;
}

export function makeDirectory(dir: string): void {
    execAsync([ "mkdir", "-p", dir ]);
}

export function deleteFile(path: string): void {
    execAsync([ "rm", "-r", path ]);
}

export function playSystemBell(): void {
    execAsync("canberra-gtk-play -i bell").catch((e: Error) => {
        console.error(`Couldn't play system bell. Stderr: ${e.message}\n${e.stack}`);
    });
}

/** run the specified `method` inside a try-catch block, then
  * report errors inside a notification in the shell if any.
  *
  *
  * @param options optional object with settings for the notification 
  * @param method the function to be called
  * @param args `method`'s parameters */
export function tryNotifyOptions<
    RT = any,
    T extends ((...a: Array<any>) => RT) = ((...args: Array<any>) => any)
>(
    options: {
        /** the notification summary/title string */
        summary?: string;
        /** a prefix to the error message in the notification body(only works with errors that are throwed with messages on them) */
        messagePrefix?: string;
    }|undefined, 
    method: T,
    ...args: Parameters<T>
): RT {
    let v!: RT;

    try {
        v = method(args);
    } catch(e) {
        const message = typeof e === "object" && "message" in e! ?
            (e as Error).message
        : String(e);
        let body = `${options?.messagePrefix ?? 
                `An exception occurred while executing method "${method.name}":`
        } ${(message == null || message == undefined ?
                `Unknown error/unknown error message`
        : message)}`;

        
        Notifications.getDefault().sendNotification({
            appName: "colorshell",
            summary: options?.summary ?? "Error",
            body
        });
    }

    return v;
}

/** run the specified `method` inside a try-catch block, then
  * report errors inside a notification in the shell if any.
  *
  * (laziest method in this whole project btw)
  *
  * @param method the function to be called
  * @param args `method`'s parameters */
export function tryNotify<
    RT = any,
    T extends ((...a: Array<any>) => RT) = ((...args: Array<any>) => any)
>(
    method: T,
    ...args: Parameters<T>
): RT {
    return tryNotifyOptions(undefined, method, ...args);
}

export function isInstalled(commandName: string): boolean {
    const proc = Gio.Subprocess.new(["bash", "-c", `command -v ${commandName}`],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

    const [ , stdout, stderr ] = proc.communicate_utf8(null, null);
    if(stdout && !stderr) 
        return true;

    return false;
}

export function addSliderMarksFromMinMax(slider: Astal.Slider, amountOfMarks: number = 2, markup?: (string | null)) {
    if(markup && !markup.includes("{}")) 
        markup = `${markup}{}`

    slider.add_mark(slider.min, Gtk.PositionType.BOTTOM, markup ? 
        markup.replaceAll("{}", `${slider.min}`) : null);

    const num = (amountOfMarks - 1);
    for(let i = 1; i <= num; i++) {
        const part = (slider.max / num) | 0;

        if(i > num) {
            slider.add_mark(slider.max, Gtk.PositionType.BOTTOM, `${slider.max}K`);
            break;
        }

        slider.add_mark(part*i, Gtk.PositionType.BOTTOM, markup ? 
            markup.replaceAll("{}", `${part*i}`) : null);
    }

    return slider;
}
