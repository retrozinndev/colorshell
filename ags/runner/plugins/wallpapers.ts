import { Wallpaper } from "../../scripts/wallpaper";
import { Runner } from "../Runner";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";

import Gio from "gi://Gio?version=2.0";


class _PluginWallpapers implements Runner.Plugin {
    prefix = "#";
    prioritize = true;
    #files: (Array<string>|undefined);

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
    }

    handle(search: string) {
        if(this.#files!.length > 0)
            return this.#files!.filter(file => // not the best way to search, but it works
                Runner.regExMatch(search, file.split('/')[file.split('/').length-1])
            ).map(path => new ResultWidget({
                title: path.split('/')[path.split('/').length-1].replace(/\..*$/, ""),
                onClick: () => Wallpaper.getDefault().setWallpaper(path)
            } as ResultWidgetProps));

        return new ResultWidget({
            title: "No wallpapers found!",
            description: "Define the $WALLPAPERS variable on Hyprland or create a ~/wallpapers directory",
            icon: "image-missing-symbolic"
        } as ResultWidgetProps);
    }
}

export const PluginWallpapers = new _PluginWallpapers();
