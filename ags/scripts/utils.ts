import { createPoll } from "ags/time";
import { exec, execAsync } from "ags/process";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";

export const decoder = new TextDecoder("utf-8"),
    encoder = new TextEncoder();

export const time = createPoll(GLib.DateTime.new_now_local(), 500, () => 
    GLib.DateTime.new_now_local());

export function getHyprlandInstanceSig(): (string|null) {
    return GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
}

export function getHyprlandVersion(): string {
    return exec(`${GLib.getenv("HYPRLAND_CMD") || "Hyprland"} --version | head -n1`).split(" ")[1];
}

export function omitObjectKeys<ObjT = object>(obj: ObjT, keys: keyof ObjT|Array<keyof ObjT>): ObjT {
    for(const objKey of Object.keys(obj)) {
        for(const omitKey of keys) {}
    }
}

export function makeDirectory(dir: string): void {
    execAsync([ "mkdir", "-p", dir ]);
}

export function deleteFile(path: string): void {
    execAsync([ "rm", "-r", path ]);
}

export function isInstalled(commandName: string): boolean {
    const proc = Gio.Subprocess.new(["bash", "-c", `command -v ${commandName}`],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

    const [ , stdout, stderr ] = proc.communicate_utf8(null, null);
    if(stdout && !stderr) 
        return true;

    return false;
}
