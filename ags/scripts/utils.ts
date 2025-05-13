import { exec, execAsync, GLib } from "astal";


export function getHyprlandInstanceSig(): (string|null) {
    return GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE");
}

export function getHyprlandVersion(): string {
    return exec(`${GLib.getenv("HYPRLAND_CMD") || "Hyprland"} --version | head -n1`).split(" ")[1];
}

export function makeDirectory(dir: string): void {
    execAsync([ "mkdir", "-p", dir ]);
}

export function deleteFile(path: string): void {
    execAsync([ "rm", "-r", path ]);
}

export function isInstalled(commandName: string): boolean {
    const output = exec(["bash", "-c", `command -v ${commandName}`]);
    if(output) 
        return true;

    return false;
}
