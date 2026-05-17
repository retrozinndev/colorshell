import { readFile, readFileAsync } from "ags/file";
import { createSubscription, encoder, getPID, globalScope, killProc, runtimeConfigDir } from "./utils";
import { generalConfig } from "../config";
import { execAsync } from "ags/process";
import GObject, { register, getter, gtype, property, setter, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import Notifications from "./notifications";
import AstalHyprland from "gi://AstalHyprland?version=0.1";


// TODO: support different wallpapers for each monitor
@register({ GTypeName: "Wallpaper" })
class Wallpaper extends GObject.Object {
    declare $signals: Wallpaper.SignalSignatures;
    private static instance: Wallpaper;

    #wallpaper: Gio.File|null = null;
    #userHyprpaperFile!: Gio.File;
    #defaultHyprpaperFile!: Gio.File;
    #hyprpaperFile!: Gio.File;
    #wallpapersDir!: Gio.File;
    #proc: Gio.Subprocess|null = null;


    @signal(Gio.File)
    wallpaperChanged(_: Gio.File) {}

    @property(Boolean)
    splash: boolean = true;


    /** current wallpaper's `GFile`. can be null if unset by the user */
    @getter(gtype<Gio.File|null>(Gio.File))
    get wallpaper() { return this.#wallpaper; }

    @setter(gtype<Gio.File|null>(Gio.File))
    set wallpaper(newValue: Gio.File|null) { this.setWallpaper(newValue); }

    get wallpapersDir() { return this.#wallpapersDir; }

    @property(gtype<Wallpaper.Positioning>(String))
    positioning: Wallpaper.Positioning = "cover";

    @property(gtype<Wallpaper.WalColorMode>(String))
    colorMode: Wallpaper.WalColorMode = "darken";


    constructor(props?: Wallpaper.ConstructorProps) {
        super(props);

        this.#wallpapersDir = Gio.File.new_for_path(
            GLib.getenv("WALLPAPERS") ?? `${GLib.get_home_dir()}/wallpapers`
        );
        this.#userHyprpaperFile = Gio.File.new_for_path(
            `${GLib.get_user_config_dir()}/hypr/hyprpaper.conf`
        );
        this.#defaultHyprpaperFile = Gio.File.new_for_path(
            `${runtimeConfigDir.peek_path()!}/hyprpaper.conf`
        );
        this.#hyprpaperFile = this.#userHyprpaperFile;

        if(!this.#hyprpaperFile.query_exists(null))
            this.#hyprpaperFile = this.#defaultHyprpaperFile;

        try {
            this.#wallpaper = this.readWallpaper();
        } catch(_) {
            throw new Error("Wallpaper: Couldn't get wallpaper from hyprpaper file! You \
may check the syntax of your hyprpaper.conf for errors");
        }

        const pid = getPID("hyprpaper");
        if(pid != null)
            killProc(pid);

        this.restartDaemon().catch((e: Error) => {
            console.error(`Wallpaper: Couldn't restart hyprpaper daemon. Stderr: ${e.message}`);
        });

        globalScope.run(() => {
            createSubscription(
                generalConfig.bindProperty("wallpaper.color_mode", "string"),
                () => {
                    const mode = generalConfig.getProperty("wallpaper.color_mode", "string");

                    if(!mode || (mode !== "darken" && mode !== "lighten")) {
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't update color mode",
                            body: "Invalid mode. Possible values are: \"darken\" or \"lighten\""
                        });
                        return;
                    };

                    this.colorMode = mode as Wallpaper.WalColorMode;
                }
            );

            createSubscription(
                generalConfig.bindProperty("wallpaper.positioning", "string"),
                () => {
                    const positioning = generalConfig
                        .getProperty("wallpaper.positioning", "string") as Wallpaper.Positioning;

                    if(!positioning || (positioning !== "contain" && 
                                        positioning !== "cover" && 
                                        positioning !== "tile" &&
                                        positioning !== "fill")) {

                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't update wallpaper position",
                            body: "Invalid position value. Possible values are: \"cover\"(default), \"contain\", \"tile\" or \"fill\""
                        });
                        return;
                    }

                    this.positioning = positioning;
                    this.reloadWallpaper().catch(e => {
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't update wallpaper position",
                            body: `An error occurred while updating wallpaper's position: ${e.message}`
                        });
                    });
                }
            );

            createSubscription(
                generalConfig.bindProperty("wallpaper.splash", "boolean"),
                () => {
                    const splash = generalConfig.getProperty("wallpaper.splash", "boolean");

                    this.splash = splash;
                    this.writeChanges();

                    Notifications.getDefault().sendNotification({
                        appName: "colorshell",
                        summary: "Wallpaper configuration",
                        body: "This change will only take effect after a hyprpaper restart. Click the \"restart\" button to restart the wallpaper daemon",
                        actions: [{
                            text: "Restart",
                            id: "restart-daemon",
                            onAction: () => {
                                this.restartDaemon().catch(e => {
                                    Notifications.getDefault().sendNotification({
                                        appName: "colorshell",
                                        summary: "Failed to restart service",
                                        body: `Couldn't restart the hyprpaper service: ${e}`
                                    });
                                });
                            }
                        }]
                    });
                }
            );
        });
    }

    public static getDefault(): Wallpaper {
        if(!this.instance)
            this.instance = new Wallpaper();

        return this.instance;
    }


    /** tries to kill the wallpaper daemon.
      * @returns `true` on success, or else, `false` */
    public async quitDaemon(): Promise<boolean> {
        if(!this.#proc)
            return false;

        return new Promise((resolve, reject) => {
            // wait for it to close, so we can resolve() the Promise
            this.#proc!.wait_async(null, (_, res) => {
                let result!: boolean;
                try {
                    result = this.#proc!.wait_finish(res);
                } catch(e) {
                    reject(e);
                    return;
                }

                resolve(result);
            });

            this.#proc!.force_exit();
        });
    }

    public async restartDaemon(): Promise<void> {
        if(this.#proc)
            await this.quitDaemon();

        this.#proc = Gio.Subprocess.new(["hyprpaper", "--config", this.#hyprpaperFile.peek_path()!], Gio.SubprocessFlags.STDOUT_SILENCE);
    }

    private writeChanges(): void {
        // check if current config is default, so we write to the right path.
        if(this.#hyprpaperFile.equal(this.#defaultHyprpaperFile))
            this.#hyprpaperFile = this.#userHyprpaperFile;

        const dir = this.#hyprpaperFile.get_parent();
        if(dir && !dir.query_exists(null))
            dir.make_directory_with_parents(null);

        this.#hyprpaperFile.replace_contents_async(encoder.encode(
`# This file was automatically generated by colorshell

splash = ${this.splash}

wallpaper {
    monitor = *
    path = ${this.#wallpaper?.peek_path()?.replaceAll(',', "\\,")}
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
    
    public readWallpaper(): Gio.File|null {
        const content = readFile(this.#hyprpaperFile);
        const loaded = content.split('\n').find(line => 
            /^[ ]*?path[ ]*?\=[ *]?.*/.test(line.trimStart())
        )?.split('=')[1]?.trim().replace(/\\(.)/g, "$1"); // fix escaped characters

        if(!loaded) 
            return null;

        return Gio.File.new_for_path(loaded);
    }

    public async readWallpaperAsync(): Promise<Gio.File|null> {
        const content = await readFileAsync(this.#hyprpaperFile);
        const loaded = content.split('\n').find(line => 
            /^[ ]*?path[ ]*?\=[ *]?.*/.test(line.trimStart())
        )?.split('=')[1]?.trim().replace(/\\(.)/g, "$1");

        if(!loaded) 
            return null;

        return Gio.File.new_for_path(loaded);
    }

    public async reloadWallpaper(write: boolean = true): Promise<void> {
        if(this.#wallpaper?.peek_path()?.trim() === "")
            return;

        for(const mon of AstalHyprland.get_default().get_monitors()) {
            await execAsync(`hyprctl hyprpaper wallpaper '${mon.get_name()},${
                this.#wallpaper?.peek_path()?.replaceAll(/,|\\/g, "\\&")
            },${this.positioning}'`);
        }

        write && this.writeChanges();
    }

    public setWallpaper(file: string|Gio.File|null, write: boolean = true): void {
        file = typeof file === "string" ? Gio.File.new_for_path(file) : file;

        if(file === undefined || file === null) {
            this.#hyprpaperFile = this.#defaultHyprpaperFile; // fallback to default if unset
            this.restartDaemon();
            return;
        }

        if(!file.query_exists(null))
            throw new Error("Wallpaper: Couldn't set wallpaper to a file that does not exist");

        this.#wallpaper = file;
        this.notify("wallpaper");

        this.reloadWallpaper(write).then(() => {
            this.emit("wallpaper-changed", this.#wallpaper!);
        }).catch((e: Error) => {
            console.error("Wallpaper: Couldn't set wallpaper:", e);
        });
    }

    public async pickWallpaper(): Promise<string|undefined> {
        return (await execAsync(`zenity --file-selection`).then(wall => {
            if(!wall.trim()) return undefined;

            this.setWallpaper(wall);
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
