import { exec, execAsync } from "ags/process";
import { readFile, readFileAsync } from "ags/file";
import GObject, { register, getter, gtype, property, setter } from "ags/gobject";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import { createSubscription, encoder, getPID, killProc } from "./utils";
import { Notifications } from "./notifications";
import { generalConfig } from "../config";
import { createRoot, getScope, Scope } from "ags";


type WalData = {
    checksum: string;
    wallpaper: string;
    alpha: number;
    special: {
        background: string;
        foreground: string;
        cursor: string;
    };
    colors: {
        color0: string;
        color1: string;
        color2: string;
        color3: string;
        color4: string;
        color5: string;
        color6: string;
        color7: string;
        color8: string;
        color9: string;
        color10: string;
        color11: string;
        color12: string;
        color13: string;
        color14: string;
        color15: string;
    };
};


export type WalMode = "darken"|"lighten";

/** wallpaper tiling mode */
export type WallpaperPositioning = "contain"|"tile"|"cover"|"fill";

// TODO: support different wallpapers for each monitor
@register({ GTypeName: "Wallpaper" })
export class Wallpaper extends GObject.Object {
    private static instance: Wallpaper;
    #wallpaper: (string|undefined);
    #scope!: Scope;
    #splash: boolean = true;
    #hyprpaperFile: Gio.File;
    #wallpapersPath: string;
    /** pywal-generated colors file */
    #walFile: Gio.File = Gio.File.new_for_path(`${GLib.get_user_cache_dir()}/wal/colors`);
    #proc: Gio.Subprocess|null = null;

    @getter(Boolean)
    public get splash() { return this.#splash; }
    public set splash(showSplash: boolean) {
        this.#splash = showSplash;
        this.notify("splash");
    }

    /** current wallpaper's complete path. can be an empty string if undefined */
    @getter(String)
    get wallpaper() { return this.#wallpaper ?? ""; }

    @setter(String)
    set wallpaper(newValue: string) { this.setWallpaper(newValue); }

    get wallpapersPath() { return this.#wallpapersPath; }

    @property(gtype<WallpaperPositioning>(String))
    positioning: WallpaperPositioning = "cover";

    @property(gtype<WalMode>(String))
    colorMode: WalMode = "darken";

    constructor() {
        super();

        this.#wallpapersPath = GLib.getenv("WALLPAPERS") ?? 
            `${GLib.get_home_dir()}/wallpapers`;

        this.#hyprpaperFile = Gio.File.new_for_path(`${
            GLib.get_user_config_dir()}/hypr/hyprpaper.conf`);

        if(!this.#hyprpaperFile.query_exists(null)) {
            throw new Error("Wallpaper: Couldn't find hyprpaper config file! \
Please provide the configuration file for colorshell to be able to generate colors!!"); // TODO: integrate a default wallpaper in gresource
        }

        try {
            this.#wallpaper = this.getWallpaper();
        } catch(_) {
            throw new Error("Wallpaper: Couldn't get wallpaper from hyprpaper file! You \
may check the syntax of your hyprpaper.conf for errors");
        }

        if(!this.#walFile.query_exists(null))
            this.reloadColors();

        const pid = getPID("hyprpaper");

        if(pid != null)
            killProc(pid);

        this.restartDaemon();

        createRoot(() => {
            this.#scope = getScope();

            createSubscription(
                generalConfig.bindProperty("wallpaper.color_mode", "string"),
                () => {
                    const mode = generalConfig.getProperty("wallpaper.color_mode", "string");

                    if(this.colorMode === mode)
                        return;

                    if(!mode || (mode !== "darken" && mode !== "lighten")) {
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Couldn't update color mode",
                            body: "Invalid mode. Possible values are: \"darken\" or \"lighten\""
                        });
                        return;
                    };

                    this.colorMode = mode as WalMode;
                    this.reloadColorsAsync().catch(console.error);
                }
            );

            createSubscription(
                generalConfig.bindProperty("wallpaper.positioning", "string"),
                () => {
                    const positioning = generalConfig
                        .getProperty("wallpaper.positioning", "string") as WallpaperPositioning;

                    if(this.positioning === positioning)
                        return;

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

                    if(this.#splash === splash)
                        return;

                    this.#splash = splash;
                    this.notify("splash");

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

    vfunc_dispose(): void {
        this.#scope?.dispose();
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

        this.#proc = Gio.Subprocess.new(["hyprpaper"], Gio.SubprocessFlags.STDOUT_SILENCE);
    }

    private writeChanges(): void {
        this.#hyprpaperFile.replace_contents_async(encoder.encode(
`# This file was automatically generated by colorshell

splash = ${this.#splash}

wallpaper {
    monitor = 
    path = ${this.#wallpaper?.replaceAll(',', "\\,")}
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

    public getData(): WalData {
        const content = readFile(`${GLib.getenv("XDG_CACHE_HOME")}/wal/colors.json`);
        return JSON.parse(content) as WalData;
    }

    
    public getWallpaper(): string|undefined {
        const content = readFile(this.#hyprpaperFile);
        const loaded = content.split('\n').find(line => 
            /^( *)?path( *)?\=( *)?.*/.test(line.trimStart())
        )?.split('=')[1]?.trim().replace(/\\(.)/g, "$1"); // fix escaped characters

        if(!loaded) 
            return undefined;

        return loaded;
    }

    public async getWallpaperAsync(): Promise<string|undefined> {
        return await readFileAsync(this.#hyprpaperFile).then(stdout => {
            const loaded = stdout.split('\n').find(line => 
                /^path( )?\=/.test(line.trimStart())
            )?.split('=')[1]?.trim();

            if(!loaded) 
                console.warn(`Wallpaper: Couldn't get wallpaper. There is(are) no loaded wallpaper(s)`);

            return loaded;
        }).catch((e: Error) => {
            console.error(`Wallpaper: Couldn't get wallpaper. Stderr: \n${e.message}`);
            return undefined;
        });
    }

    public reloadColors(): void {
        try {
            exec(`wal -t --cols16 "${this.colorMode}" -i "${this.#wallpaper}"`);
        } catch(e) {
            throw new Error(`Wallpaper: Couldn't update shell colors. Stderr: ${(e as Error).message}`);
        }
    }

    public async reloadColorsAsync(): Promise<void> {
        try {
            await execAsync(`wal -t --cols16 "${this.colorMode}" -i "${this.#wallpaper}"`);
        } catch(e) {
            throw new Error(`Wallpaper: Couldn't update shell colors. Stderr: ${(e as Error).message}`);
        }
    }

    public async reloadWallpaper(write: boolean = true): Promise<void> {
        if(this.#wallpaper?.trim() === "")
            return;

        exec(`hyprctl hyprpaper wallpaper ", ${this.#wallpaper?.replaceAll(',', "\\,")}, ${this.positioning}"`);

        write && this.writeChanges();
    }

    public setWallpaper(path: string|Gio.File, write: boolean = true): void {
        path = typeof path === "string" ? path : path.peek_path()!;

        if(!GLib.file_test(path, GLib.FileTest.EXISTS)) {
            console.error("Wallpaper: file does not exist, skipped");
            return;
        }

        const reloadColors = this.#wallpaper !== path; // only reload colors if wallpaper is different
        this.#wallpaper = path;
        this.notify("wallpaper");
        this.reloadWallpaper(write).then(() => {
            reloadColors && this.reloadColorsAsync().catch(console.error);
        }).catch((e: Error) => {
            console.error(`Wallpaper: Couldn't set wallpaper. Stderr: ${e.message}`);
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
