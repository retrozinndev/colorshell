export {
    toBoolean as variableToBoolean, 
    construct, 
    filter,
    transform,
    transformWidget,
    createSubscription,
    createAccessorBinding as baseBinding,
    createScopedConnection,
    createSecureBinding as secureBinding,
    createSecureAccessorBinding as secureBaseBinding,
} from "gnim-utils";
import { createPoll } from "ags/time";
import { exec, execAsync } from "ags/process";
import { Astal, Gtk } from "ags/gtk4";
import { getSymbolicIcon } from "./apps";
import { createRoot, getScope, Scope } from "ags";
import Notifications from "./notifications";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";

Gio._promisify(Gio.DataInputStream.prototype, "read_upto_async", "read_upto_finish");

export const decoder = new TextDecoder("utf-8"),
    encoder = new TextEncoder();
export const time = createPoll(GLib.DateTime.new_now_local(), 500, () => 
    GLib.DateTime.new_now_local());

export const globalScope: Scope = createRoot(() => getScope());

export const runtimeDir: Gio.File = Gio.File.new_for_path(`${
    GLib.get_user_runtime_dir() ?? `/run/user/${exec("id -u").trim()}`}/colorshell`);
export const dataDir: Gio.File = Gio.File.new_for_path(`${
    GLib.get_user_data_dir() ?? `${GLib.get_home_dir()}/.local/share`}/colorshell`);
export const cacheDir: Gio.File = Gio.File.new_for_path(`${
    GLib.get_user_cache_dir() ?? `${GLib.get_home_dir()}/.cache`}/colorshell`);
/** where runtime-generated config files are stored */
export const runtimeConfigDir: Gio.File = Gio.File.new_for_path(`${runtimeDir.peek_path()}/config`);


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
    return new Promise((resolve, reject) => {
        Gio.DBus.get(Gio.BusType.SESSION, null, (_, res) => {
            let bus: Gio.DBusConnection|undefined;
            try {
                bus = Gio.DBus.get_finish(res);
            } catch(e) {
                reject(e);
                return;
            }

            Gio.DBusProxy.new(
                bus, Gio.DBusProxyFlags.NONE, null, name, objectPath, iface, null,
                (_, res) => {
                    let proxy: Gio.DBusProxy|undefined;
                    try {
                        proxy = Gio.DBusProxy.new_finish(res);
                    } catch(e) {
                        reject(e);
                        return;
                    }

                    const params = GLib.Variant.new("(s)", [proxy.get_name_owner()!]);
                    bus.call(
                        "org.freedesktop.DBus",
                        "/org/freedesktop/DBus",
                        "org.freedesktop.DBus",
                        "GetConnectionUnixProcessID",
                        params,
                        GLib.VariantType.new("(u)"),
                        Gio.DBusCallFlags.NONE,
                        300,
                        null,
                        (_, res) => {
                            let pid: GLib.Variant<"(u)">|undefined;
                            try {
                                pid = bus.call_finish(res);
                                resolve(pid.get_child_value(0).get_uint32());
                            } catch(e) {
                                reject(e);
                                return;
                            }
                        }
                    );
                }
            );
        });
    });
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

/** watch when an object is recycled by the GC */
export function watchRecycle(value: any, onRecycle: () => void): void {
    const registry = new FinalizationRegistry(() => onRecycle());
    registry.register(value, Symbol(value));
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

/** watch `stream` for output and call `callback` with the latest data.
  * this method is non-blocking, you can use it anywhere. the monitoring is stopped when
  * `stream` is closed or when `callback` returns `true`.
  *
  * @param stream the `GInputStream` to watch for data
  * @param callback the function to call when there's new data (return `true` to remove the watch)
  * @param cancellable a `GCancellable` that stops the monitor when ::cancelled 
  * @param size the number of bytes to read from `stream`. default: `4096` */
export async function watchInputStream(
    stream: Gio.InputStream|Gio.DataInputStream,
    callback: (data: string) => boolean|void,
    cancellable?: Gio.Cancellable|null
): Promise<void> {
    const istream = stream instanceof Gio.DataInputStream ?
        stream
    : Gio.DataInputStream.new(stream);
    let stop: boolean = false;

    const id = cancellable?.connect(() => {
        cancellable.disconnect(id!);
        stop = true;
    });

    while(!stop)
        stop = callback(
            (await istream.read_upto_async('\x00', -1, GLib.PRIORITY_DEFAULT, null))?.[0]
        ) ?? false;
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
