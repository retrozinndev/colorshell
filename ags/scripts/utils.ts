import { createPoll } from "ags/time";
import { exec, execAsync } from "ags/process";
import { Accessor, For, With } from "ags";
import { Astal, Gtk } from "ags/gtk4";
import { getSymbolicIcon } from "./apps";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Xdp from "gi://Xdp?version=1.0";


/** gnim doesn't export this, so we need to do it again */
export type WidgetNodeType = Array<JSX.Element> | JSX.Element | number | string | boolean | null | undefined;

export const decoder = new TextDecoder("utf-8"),
    encoder = new TextEncoder();
export const time = createPoll(GLib.DateTime.new_now_local(), 500, () => 
    GLib.DateTime.new_now_local());
export const XdgPortal = Xdp.Portal.new();

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

export function variableToBoolean(variable: any|Array<any>|Accessor<Array<any>|any>): boolean|Accessor<boolean> {
    return (variable instanceof Accessor) ?
        variable.as(v => Array.isArray(v) ?
            (v as Array<any>).length > 0
        : Boolean(v))
    : Array.isArray(variable) ?
        variable.length > 0
    : Boolean(variable);
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

export function transform<ValueType = any|Array<any>, RType = any>(
    v: Accessor<ValueType>|ValueType, fn: (v: ValueType) => RType
): RType|Accessor<RType> {

    return (v instanceof Accessor) ?
        v.as(fn)
    : fn(v);
}

export function transformWidget<ValueType = unknown>(
    v: Accessor<ValueType|Array<ValueType>>|ValueType|Array<ValueType>, 
    fn: (v: ValueType, i?: Accessor<number>|number) => JSX.Element
): WidgetNodeType {

    return (v instanceof Accessor) ?
        Array.isArray(v.get()) ?
            For({
                each: v as Accessor<Array<ValueType>>,
                children: (cval, i) => fn(cval, i)
            })
        : With({
            value: v as Accessor<ValueType>,
            children: fn
        })
    : (Array.isArray(v) ?
        v.map(val => fn(val))
    : fn(v));
}

export function filter<ValueType = unknown, FilterReturnType = unknown>(
    v: Accessor<Array<ValueType>>|Array<ValueType>, 
    fn: (v: ValueType, i: number, array: Array<ValueType>) => FilterReturnType
): Array<ValueType>|Accessor<Array<ValueType>> {
    return ((v instanceof Accessor) ?
        v(v => v.filter((it, i, arr) => fn(it, i, arr)))
    : v.filter((it, i, arr) => fn(it, i, arr)));
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
