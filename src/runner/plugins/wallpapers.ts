import Fuse, { IFuseOptions } from "fuse.js";
import { Wallpaper } from "../../modules/wallpaper";
import { Runner } from "../Runner";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


class _PluginWallpapers implements Runner.Plugin {
    prefix = "#";
    prioritize = true;
    #fuse!: Fuse<string>;
    #files!: Array<Gio.FileInfo>;
    #dir: string = Wallpaper.getDefault().wallpapersPath;
    #subdir: string|undefined = undefined;
    readonly #options = {
        useExtendedSearch: false,
        shouldSort: true,
        isCaseSensitive: false
    } satisfies IFuseOptions<string>;

    init() {
        this.#files = [];
        this.#subdir = undefined;

        const dir = Gio.File.new_for_path(this.#dir);
        if(dir.query_file_type(null, null) === Gio.FileType.DIRECTORY) {
            for(const file of dir.enumerate_children(
                "standard::*",
                Gio.FileQueryInfoFlags.NONE,
                null
            )) {
                this.#files.push(file);
            }
        }

        this.#fuse = new Fuse<string>(
            this.#files.map(inf => inf.get_name()) as ReadonlyArray<string>,
            this.#options
        );
    }

    private result(info: Gio.FileInfo): Runner.Result {
        return {
            title: `${info.get_display_name()}${info.get_file_type() === Gio.FileType.DIRECTORY ? "/" : ""}`,
            icon: info.get_file_type() === Gio.FileType.DIRECTORY ?
                "inode-directory-symbolic"
            : undefined,
            closeOnClick: info.get_file_type() !== Gio.FileType.DIRECTORY,
            actionClick: () => {
                if(info.get_file_type() === Gio.FileType.DIRECTORY) {
                    Runner.setEntryText(
                        this.#subdir !== undefined ?
                            `#${this.#subdir.startsWith('/') ? 
                                this.#subdir
                            : `/${this.#subdir}`}/${info.get_name()}/`
                        : `#/${info.get_name()}/`
                    );
                    return;
                }

                Wallpaper.getDefault().setWallpaper(
                    `${Wallpaper.getDefault().wallpapersPath}/${
                        this.#subdir ? `${this.#subdir}/` : ""
                    }${info.get_name()}`
                );
            }
        };
    }

    async handle(search: string, limit?: number) {
        if(!GLib.file_test(this.#dir, GLib.FileTest.IS_DIR)) 
            return {
                title: "No wallpapers found!",
                description: "Define the WALLPAPERS variable in Hyprland or create ~/wallpapers",
                icon: "image-missing-symbolic"
            };

        this.#subdir = undefined;

        if(search.startsWith('/')) {   
            let split = search.split('/').filter(s => s.trim() !== "");

            search = split.length > 1 && !search.endsWith('/') ?
                split[split.length - 1]
            : "";
            split = split.filter(s => s !== search);
            this.#subdir = split.join('/');

            if(this.#subdir === undefined) {
                this.#fuse = new Fuse<string>(
                    this.#files.filter(inf => 
                        inf.get_file_type() === Gio.FileType.DIRECTORY
                    ).map(inf => inf.get_name()) as ReadonlyArray<string>,
                    this.#options
                );

                return this.#fuse.search(search.replace(/^\//, "")).map(r => {
                    const info = this.#files.filter(inf => 
                        inf.get_name() === r.item
                    )[0];

                    return this.result(info);
                });
            }

            // TODO: recursive search for subdirectories

            if(GLib.file_test(`${this.#dir}/${this.#subdir}`, GLib.FileTest.IS_DIR)) {
                const dir = Gio.File.new_for_path(`${this.#dir}/${this.#subdir}`);
                this.#files = [];

                for(const file of dir.enumerate_children(
                    "standard::*",
                    Gio.FileQueryInfoFlags.NONE,
                    null
                )) {
                    this.#files.push(file);
                }

                this.#fuse = new Fuse<string>(
                    this.#files.map(n => n.get_name()) as ReadonlyArray<string>,
                    this.#options
                );
            }
        }

        if(search.length < 1)
            return this.#files.sort(s => 
                s.get_file_type() === Gio.FileType.DIRECTORY ? 1 : -1
            ).map(info => this.result(info));


        const results: Array<Runner.Result> = [];

        this.#fuse.search(search, {
            limit: limit ?? Infinity
        }).map(result => {
            const info = this.#files.filter(inf => 
                inf.get_name() === result.item
            )[0];

            results.push(this.result(info));
        });


        if(results.length < 1)
            return {
                title: "No results found",
                description: "Wallpaper with provided name was not found :("
            } satisfies Runner.Result;

        return results;
    }
}

export const PluginWallpapers = new _PluginWallpapers();
