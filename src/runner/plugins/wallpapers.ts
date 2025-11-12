import Fuse, { IFuseOptions } from "fuse.js";
import { Wallpaper } from "../../modules/wallpaper";
import { Runner } from "../Runner";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import { Gdk, Gtk } from "ags/gtk4";
import { createScopedConnection } from "gnim-utils";
import Gly from "gi://Gly?version=2";
import GlyGtk4 from "gi://GlyGtk4?version=2";
import { createRoot, getScope, Scope } from "ags";


class _PluginWallpapers implements Runner.Plugin {
    prefix = "#";
    prioritize = true;
    #fuse!: Fuse<string>;
    #files!: Array<Gio.FileInfo>;
    #dir: string = Wallpaper.getDefault().wallpapersPath;
    #subdir: string|undefined = undefined;
    #scope!: Scope;
    #cache: Map<string, Gly.Frame> = new Map();
    readonly #options = {
        useExtendedSearch: false,
        shouldSort: true,
        isCaseSensitive: false
    } satisfies IFuseOptions<string>;

    init() {
        this.#files = [];
        this.#subdir = undefined;
        if(!this.#scope)
            this.#scope = getScope();

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

    onClose() {
        this.#cache.forEach((frame) => {
            frame.run_dispose();
        });
        this.#cache.clear();
    }

    private result(info: Gio.FileInfo): Runner.Result {
        const isDir: boolean = info.get_file_type() === Gio.FileType.DIRECTORY;
        const path: string = `${Wallpaper.getDefault().wallpapersPath}/${
            this.#subdir ? `${this.#subdir}/` : ""
        }${info.get_name()}`;

        return {
            title: `${info.get_display_name()}${isDir ? "/" : ""}`,
            icon: isDir ? "inode-directory-symbolic" : undefined,
            closeOnClick: !isDir,
            $: (self) => {
                if(isDir) return;

                const eventMotion = Gtk.EventControllerMotion.new(),
                    eventFocus = Gtk.EventControllerFocus.new();

                const revealer = new Gtk.Revealer({
                    child: new Gtk.Picture({
                        hexpand: true,
                        heightRequest: 128,
                        contentFit: Gtk.ContentFit.COVER
                    })
                });

                let loaded: boolean = false;
                const loadWallpaper = () => {
                    if(!GLib.file_test(path, GLib.FileTest.EXISTS))
                        return;

                    const pic = revealer.get_child()! as Gtk.Picture;
                    const loader = Gly.Loader.new(Gio.File.new_for_path(path));
                    let image: Gly.Image|undefined,
                        texture: Gdk.Texture|undefined;

                    const onLoadFinish = () => {
                        if(image !== undefined && texture !== undefined) {
                            try {
                                pic.set_paintable(texture);
                            } catch(e) { console.error(e); }
                        }
                    };

                    if(!this.#cache.has(path)) {
                        loader.load_async(null, (_, res) => {
                            try {
                                image = loader.load_finish(res);
                                const frame = image.next_frame();
                                texture = GlyGtk4.frame_get_texture(frame);
                                this.#cache.set(path, frame);
                            } catch(e) { console.error(e); }

                            onLoadFinish();
                        });
                    } else {
                        texture = GlyGtk4.frame_get_texture(this.#cache.get(path)!);
                        onLoadFinish();
                    }
                };

                const onFocus = () => {
                    if(!loaded) {
                        loadWallpaper();
                        loaded = true;
                    }

                    revealer.set_reveal_child(true);
                };

                const onFocusLost = () => revealer.set_reveal_child(false);

                self.set_orientation(Gtk.Orientation.VERTICAL);
                self.prepend(revealer);

                self.add_controller(eventMotion);
                self.add_controller(eventFocus);

                createRoot(() => {
                    if(!GLib.file_test(path, GLib.FileTest.EXISTS))
                        return;

                    const scope = getScope();

                    createScopedConnection(self, "destroy", () => scope.dispose());
                    createScopedConnection(eventMotion, "enter", () => onFocus());
                    createScopedConnection(eventMotion, "leave", () => onFocusLost());
                    createScopedConnection(eventFocus, "enter", () => onFocus());
                    createScopedConnection(eventFocus, "leave", () => onFocusLost());
                });
            },
            actionClick: () => {
                if(isDir) {
                    Runner.setEntryText(
                        this.#subdir !== undefined ?
                            `#${this.#subdir.startsWith('/') ? 
                                this.#subdir
                            : `/${this.#subdir}`}/${info.get_name()}/`
                        : `#/${info.get_name()}/`
                    );
                    return;
                }


                if(!GLib.file_test(path, GLib.FileTest.EXISTS))
                    return;
                Wallpaper.getDefault().setWallpaper(path);
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
