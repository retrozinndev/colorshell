import { readFile, readFileAsync } from "ags/file";
import { encoder, expandPath, getPID, killProc } from "./utils";
import { generalConfig } from "../config";
import { execAsync } from "ags/process";
import GObject, { register, getter, gtype, setter, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import Notifications from "./notifications";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import Compositor from "../compositor";


// TODO: support different wallpapers for each monitor
@register({ GTypeName: "Wallpaper" })
class Wallpaper extends GObject.Object {
    declare $signals: Wallpaper.SignalSignatures;
    private static instance: Wallpaper;

    #wallpaper: Gio.File|null = null;
    #hyprpaperFile: Gio.File;

    @signal(Gio.File)
    wallpaperChanged(_: Gio.File) {}

    @getter(Boolean)
    get splash(): boolean { return generalConfig.getProperty("wallpaper.splash", "boolean"); }

    @getter(gtype<Wallpaper.Positioning>(String))
    get positioning(): Wallpaper.Positioning {
        const pos = generalConfig.getProperty("wallpaper.positioning", "string") as Wallpaper.Positioning;

        if(!pos || (pos !== "contain" && pos !== "cover" && 
            pos !== "tile" && pos !== "fill")) {

            return "cover";
        }

        return pos;
    }

    @getter(Object)
    get dirs(): Record<string, Gio.File> {
        const dirs = generalConfig.getProperty("wallpaper.dirs", "array");
        if(!dirs.every(i => typeof i === "string"))
            return {
                "~/wallpapers": Gio.File.new_for_path(`${GLib.get_home_dir()}/wallpapers`)
            };

        const obj: Record<string, Gio.File> = {};
        for(const path of dirs)
            obj[path as keyof typeof obj] = Gio.File.new_for_path(expandPath(path));

        return obj;
    }

    /** current wallpaper's `GFile`. can be null if unset by the user */
    @getter(gtype<Gio.File|null>(Gio.File))
    get wallpaper() { return this.#wallpaper; }
    @setter(gtype<Gio.File|null>(Gio.File))
    set wallpaper(file: Gio.File|null) {
        if(file === undefined || file === null)
            file = Gio.File.new_for_path("/usr/share/hypr/wall2.jpg");
        else if(!file.query_exists(null))
            throw new Error("Wallpaper: Couldn't set wallpaper to a file that does not exist");

        this.#wallpaper = file;
        this.notify("wallpaper");

        this.reapply(true).then(() => {
            this.emit("wallpaper-changed", this.#wallpaper!);
        }).catch((e: Error) => {
            console.error("Wallpaper: Couldn't set wallpaper:", e);
        });
    }

    constructor(props?: Wallpaper.ConstructorProps) {
        super(props);

        this.#hyprpaperFile = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/hypr/hyprpaper.conf`);

        if(!this.#hyprpaperFile.query_exists(null))
            this.wallpaper = null; // so it'll write a default one
        else {
            try {
                this.#wallpaper = this.read();
            } catch(_) {
                throw new Error("Wallpaper: Couldn't get wallpaper from hyprpaper file! You \
    may check the syntax of your hyprpaper.conf for errors");
            }
        }

        const pid = getPID("hyprpaper");
        if(pid == null) {
            console.warn(`Wallpaper: hyprpaper isn't currently running or it couldn't be spotted.`);
            console.warn(`Wallpaper: Functionality like wallpaper hot-reloading may not work`);
        }


        generalConfig.connect("property-changed", (_, path: string) => {
            switch(path) {
                case "wallpaper.positioning": {
                    const positioning = generalConfig.getProperty(path, "string") as Wallpaper.Positioning;

                    if(!positioning || (positioning !== "contain" && positioning !== "cover" && 
                        positioning !== "tile" && positioning !== "fill")) {

                        generalConfig.setProperty("wallpaper.positioning", "cover");
                        this.notify("positioning");
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't update wallpaper position",
                            body: "Invalid position value. Possible values are: \"cover\"(default), \"contain\", \"tile\" or \"fill\""
                        });

                        return;
                    }

                    this.notify("positioning");
                    this.reapply().catch(e => {
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't update wallpaper position",
                            body: `An error occurred while updating wallpaper's position: ${e.message}`
                        });
                    });

                    break;
                }

                case "wallpaper.splash": {
                    this.notify("splash");
                    Notifications.getDefault().sendNotification({
                        summary: "Wallpaper configuration",
                        body: "This change will only take effect after a hyprpaper restart. \
If you're using the systemd service instead, click the \"Restart hyprpaper.service\" action",
                        actions: [
                            {
                                text: "Restart hyprpaper.service",
                                id: "restart-service",
                                onAction() {
                                    Compositor.getDefault().exec("systemctl --user restart hyprpaper.service");
                                }
                            }, {
                                text: "Restart daemon",
                                id: "restart-daemon",
                                onAction() {
                                    const pid = getPID("hyprpaper");
                                    if(pid != null)
                                        killProc(pid);

                                    Compositor.getDefault().exec("hyprpaper");
                                }
                            }
                        ]
                    });

                    break;
                }
            }
        });
    }

    public static getDefault(): Wallpaper {
        if(!this.instance)
            this.instance = new Wallpaper();

        return this.instance;
    }

    private writeChanges(): void {
        const dir = this.#hyprpaperFile.get_parent();
        if(dir && !dir.query_exists(null))
            dir.make_directory_with_parents(null);

        this.#hyprpaperFile.replace_contents_async(encoder.encode(
`# This file was automatically generated by colorshell

splash = ${generalConfig.getProperty("wallpaper.splash", "boolean")}

wallpaper {
    monitor = *
    path = ${this.#wallpaper?.peek_path()}
    fit_mode = ${this.positioning}
}`
            ), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null,
            (_, result) => {
                try {
                    this.#hyprpaperFile.replace_contents_finish(result);
                } catch(e) {
                    console.error(`Wallpaper: an error occurred while trying to replace the hyprpaper file.`, e);
                }
            }
        );
    }
    
    public read(): Gio.File|null {
        const content = readFile(this.#hyprpaperFile);
        const loaded = content.split('\n').find(line => 
            /^[ ]*?path[ ]*?\=[ *]?.*/.test(line.trimStart())
        )?.split('=')[1]?.trim().replace(/\\(.)/g, "$1"); // fix escaped characters

        if(!loaded) 
            return null;

        return Gio.File.new_for_path(loaded);
    }

    public async readAsync(): Promise<Gio.File|null> {
        const content = await readFileAsync(this.#hyprpaperFile);
        const loaded = content.split('\n').find(line => 
            /^[ ]*?path[ ]*?\=[ *]?.*/.test(line.trimStart())
        )?.split('=')[1]?.trim().replace(/\\(.)/g, "$1");

        if(!loaded) 
            return null;

        return Gio.File.new_for_path(loaded);
    }

    public async reapply(write: boolean = true): Promise<void> {
        if(this.#wallpaper?.peek_path()?.trim() === "")
            return;

        for(const mon of AstalHyprland.get_default().get_monitors()) {
            await execAsync(`hyprctl hyprpaper wallpaper '${mon.get_name()},${
                this.#wallpaper?.peek_path()!.replace(/,/g, "\\\\,")
            },${this.positioning}'`);
        }

        write && this.writeChanges();
    }

    public async pickWallpaper(): Promise<string|undefined> {
        return (await execAsync(`zenity --file-selection`).then(wall => {
            if(!wall.trim()) return undefined;

            this.wallpaper = Gio.File.new_for_path(wall);
            return wall;
        }).catch((e: Error) => {
            console.error(`Wallpaper: Couldn't pick wallpaper, is \`zenity\` installed? Stderr: ${e.message}`);
            return undefined;
        }));
    }   
}

namespace Wallpaper {
    /** wallpaper positioning strategy */
    export type Positioning = "contain"|"tile"|"cover"|"fill";
    export type WalColorMode = "darken"|"lighten";

    export interface ConstructorProps extends GObject.Object.ConstructorProps {}
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        /** emitted when the wallpaper is changed in hyprpaper(not the :wallpaper property directly) */
        "wallpaper-changed": (file: Gio.File) => void;
    }
}

export default Wallpaper;
