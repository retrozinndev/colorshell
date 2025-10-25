import Fuse from "fuse.js";
import { Wallpaper } from "../../modules/wallpaper";
import { Runner } from "../Runner";

import Gio from "gi://Gio?version=2.0";


class _PluginWallpapers implements Runner.Plugin {
    prefix = "#";
    prioritize = true;
    #fuse!: Fuse<string>;
    #files!: Array<string>;

    init() {
        this.#files = [];
        const dir = Gio.File.new_for_path(Wallpaper.getDefault().wallpapersPath);
        if(dir.query_file_type(null, null) === Gio.FileType.DIRECTORY) {
            for(const file of dir.enumerate_children(
                "standard::*",
                Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
                null
            )) {
                this.#files.push(`${dir.get_path()}/${file.get_name()}`);
            }
        }

        this.#fuse = new Fuse<string>(
            this.#files as ReadonlyArray<string>,
            {
                useExtendedSearch: false,
                shouldSort: true,
                isCaseSensitive: false
            }
        );
    }

    private wallpaperResult(path: string): Runner.Result {
        return {
            title: path.split('/')[path.split('/').length-1].replace(/\..*$/, ""),
            actionClick: () => Wallpaper.getDefault().setWallpaper(path)
        };
    }

    handle(search: string, limit?: number) {
        if(search.trim().length === 0)
            return this.#files.map(path =>
                this.wallpaperResult(path)
            );

        if(this.#files.length > 0)
            return this.#fuse.search(search, {
                limit: limit ?? Infinity
            }).map(result => this.wallpaperResult(result.item));

        return {
            title: "No wallpapers found!",
            description: "Define the $WALLPAPERS variable on Hyprland or create a ~/wallpapers directory",
            icon: "image-missing-symbolic"
        };
    }
}

export const PluginWallpapers = new _PluginWallpapers();
