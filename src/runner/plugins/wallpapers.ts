import { Gdk, Gtk } from "ags/gtk4";
import { Wallpaper } from "../../modules/wallpaper";
import { Runner } from "../Runner";
import { createRoot, jsx } from "ags";
import { Cache } from "../../modules/cache";
import { createScopedConnection } from "gnim-utils";
import Fuse, { IFuseOptions } from "fuse.js";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import Gly from "gi://Gly?version=2";
import Adw from "gi://Adw?version=1";
import GlyGtk4 from "gi://GlyGtk4?version=2";


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

    onClose() {
        Cache.getDefault().removeSection("wallpapers"); // removes all GdkTexture references, then the gc clears everything
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
                if(isDir || !GLib.file_test(path, GLib.FileTest.EXISTS))
                    return;

                const eventMotion = Gtk.EventControllerMotion.new();
                const revealer = new Gtk.Revealer({
                    transitionType: Gtk.RevealerTransitionType.SWING_UP,
                    transitionDuration: 400,
                    child: new Gtk.Stack({
                        transitionType: Gtk.StackTransitionType.CROSSFADE,
                        transitionDuration: 500,
                        heightRequest: 128
                    })
                });

                const stack = revealer.get_child() as Gtk.Stack;
                const picture = createRoot((dispose) => jsx(Gtk.Picture, {
                    hexpand: true,
                    css: "margin-bottom: 6px;",
                    contentFit: Gtk.ContentFit.COVER,
                    onDestroy: () => dispose()
                }));

                stack.add_named(new Adw.Spinner(), "spinner");
                stack.add_named(picture, "picture");

                
                self.set_orientation(Gtk.Orientation.VERTICAL);
                self.prepend(revealer);

                self.add_controller(eventMotion);

                createRoot((dispose) => {
                    if(!GLib.file_test(path, GLib.FileTest.EXISTS))
                        return;

                    createScopedConnection(self, "destroy", () => dispose());
                    createScopedConnection(eventMotion, "enter", () => revealer.set_reveal_child(true));
                    createScopedConnection(eventMotion, "leave", () => revealer.set_reveal_child(false));
                    createScopedConnection(self, "selected", () => revealer.set_reveal_child(true));
                    createScopedConnection(self, "unselected", () => revealer.set_reveal_child(false));
                });

                function panic(e: Error): void {
                    self.remove(revealer);
                    console.error("Failed to load image for wallpaper with glycin", e);
                }

                const cached = Cache.getDefault().getItem<Gdk.Texture>("wallpapers", path);
                if(cached) {
                    picture.set_paintable(cached);
                    stack.set_visible_child_name("picture");
                    stack.remove(stack.get_child_by_name("spinner")!);
                    return;
                }

                Gly.Loader.new(Gio.File.new_for_path(path)).load_async(null, (loader, res) => {
                    let image!: Gly.Image;
                    try {
                        image = loader!.load_finish(res);
                    } catch(e) {
                        panic(e as Error);
                        return;
                    }

                    image.next_frame_async(null, (_, res) => {
                        try {
                            const texture = GlyGtk4.frame_get_texture(image.next_frame_finish(res));
                            picture.set_paintable(texture);
                            Cache.getDefault().addItem("wallpapers", texture, path);
                            stack.set_visible_child_name("picture");
                            stack.remove(stack.get_child_by_name("spinner")!);
                        } catch(e) {
                            panic(e as Error);
                            return;
                        }
                    });
                });
            },
            actionClick: () => {
                if(isDir) {
                    Runner.setEntryText(
                        this.#subdir !== undefined ?
                            `${this.prefix}${this.#subdir.startsWith('/') ? 
                                this.#subdir
                            : `/${this.#subdir}`}/${info.get_name()}/`
                        : `${this.prefix}/${info.get_name()}/`
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

                    return createRoot((dispose) => {
                        const widget = this.result(info);
                        widget.onDestroy = () => dispose();

                        return widget;
                    });
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
