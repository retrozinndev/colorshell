import { createPoll } from "ags/time";
import { exec, execAsync } from "ags/process";
import { Accessor, For, With } from "ags";
import { Astal, Gtk } from "ags/gtk4";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


/** gnim doesn't export this, so we need to do it again */
export type WidgetNodeType = Array<JSX.Element> | JSX.Element | number | string | boolean | null | undefined;

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
