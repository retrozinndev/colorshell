import { execAsync } from "ags/process";
import { readFile } from "ags/file";
import GObject, { register, getter, gtype, property, setter } from "ags/gobject";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import { createSubscription, encoder } from "./utils";
import { Notifications } from "./notifications";
import { generalConfig } from "../config";


export { Wallpaper };

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
export type WallpaperPositioning = "contain"|"tile"|"cover";

@register({ GTypeName: "Wallpaper" })
class Wallpaper extends GObject.Object {
    private static instance: Wallpaper;
    #wallpaper: (string|undefined);
    #splash: boolean = true;
    #hyprpaperFile: Gio.File;
    #wallpapersPath: string;

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

    public get wallpapersPath() { return this.#wallpapersPath; }

    @property(gtype<WallpaperMode>(String))
    positioning: WallpaperMode = "cover";

    @property(gtype<WalMode>(String))
    colorMode: WalMode = "darken";

    constructor() {
        super();

        this.#wallpapersPath = GLib.getenv("WALLPAPERS") ?? 
            `${GLib.get_home_dir()}/wallpapers`;

        this.#hyprpaperFile = Gio.File.new_for_path(`${
            GLib.get_user_config_dir()}/hypr/hyprpaper.conf`);

        this.getWallpaper().then((wall) => {
            if(wall?.trim()) this.#wallpaper = wall.trim();
        });

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

                this.colorMode = mode as WalMode;
                this.reloadColors();
            }
        );

        createSubscription(
            generalConfig.bindProperty("wallpaper.positioning", "string"),
            () => {
                const positioning = generalConfig
                    .getProperty("wallpaper.positioning", "string") as WallpaperPositioning;

                if(!positioning || (positioning !== "contain" && 
                                    positioning !== "cover" && 
                                    positioning !== "tile")) {

                    Notifications.getDefault().sendNotification({
                        appName: "colorshell",
                        summary: "Couldn't update wallpaper position",
                        body: "Invalid position value. Possible values are: \"cover\", \"contain\" or \"tile\""
                    });
                    return;
                }

                this.positioning = positioning;
                this.reloadWallpaper().catch((e: Error) => 
                    Notifications.getDefault().sendNotification({
                        appName: "colorshell",
                        summary: "Couldn't update wallpaper position",
                        body: `An error occurred while updating wallpaper's position: ${e.message}`
                    })
                );
            }
        );
    }

    public static getDefault(): Wallpaper {
        if(!this.instance)
            this.instance = new Wallpaper();

        return this.instance;
    }

    private writeChanges(): void {
        this.#hyprpaperFile.replace_async(null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            GLib.PRIORITY_DEFAULT, null, (_, result) => {
                const res = this.#hyprpaperFile.replace_finish(result);
                if(!res) {
                    console.error(`Wallpaper: an error occurred when trying to replace the hyprpaper file`);
                    return;
                }

                // success
                res.write_bytes_async(encoder.encode(`# This file was automatically generated by color-shell

                    preload = ${this.#wallpaper}
                    splash = ${this.#splash}
                    wallpaper = , ${this.#wallpaper}`.split('\n').map(str => str.trimStart()).join('\n')),
                    GLib.PRIORITY_DEFAULT, null, (_, asyncRes) => {
                        if(_!.write_finish(asyncRes)) res.flush(null);
                        res.close(null);
                    }
                );

                return;
            }
        );
    }

    public getData(): WalData {
        const content = readFile(`${GLib.getenv("XDG_CACHE_HOME")}/wal/colors.json`);
        return JSON.parse(content) as WalData;
    }

    public async getWallpaper(): Promise<string|undefined> {
        return await execAsync("hyprctl hyprpaper listactive").then(stdout => {
            const lineSplit = stdout.split('\n');
            stdout = lineSplit[lineSplit.length - 1];

            const loaded = stdout.split('=')[1]?.trim();

            if(!loaded) 
                console.warn(`Wallpaper: Couldn't get wallpaper. There is(are) no loaded wallpaper(s)`);

            return loaded;
        }).catch((err: Error) => {
            console.error(`Wallpaper: Couldn't get wallpaper. Stderr: \n${err.message}`);
            return undefined;
        });
    }

    public reloadColors(): void {
        execAsync(`wal -t --cols16 ${this.colorMode} -i "${this.#wallpaper}"`).then(() => {
            console.log("Wallpaper: reloaded shell colors");
        }).catch((e: Error) => {
            console.error(`Wallpaper: Couldn't update shell colors. Stderr: ${e.message}`);
        });
    }

    public async reloadWallpaper(write: boolean = true): Promise<void> {
        if(this.wallpaper.trim() === "")
            return;

        await execAsync(`hyprctl hyprpaper wallpaper \", ${this.positioning}:${this.wallpaper}\"`);
        this.reloadColors();
        write && this.writeChanges();
    }

    public setWallpaper(path: string|Gio.File, write: boolean = true): void {
        path = typeof path === "string" ? path : path.peek_path()!;

        execAsync("hyprctl hyprpaper unload all").then(() => 
            execAsync(`hyprctl hyprpaper preload ${path}`).then(() => 
                execAsync(`hyprctl hyprpaper wallpaper \", ${this.positioning}:${path}\"`).then(() => {
                    this.#wallpaper = path;
                    this.reloadColors();
                    write && this.writeChanges();
                }).catch((e: Error) => {
                    console.error(`Wallpaper: Couldn't set wallpaper. Stderr: ${e.message}`);
                })
            ).catch((e: Error) => {
                console.error(`Wallpaper: Couldn't preload image. Stderr: ${e.message}`);
            })
        ).catch((e: Error) => {
            console.error(`Wallpaper: Couldn't unload images from memory. Stderr: ${e.message}`);
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
