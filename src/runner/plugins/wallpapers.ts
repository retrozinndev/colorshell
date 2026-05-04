import { Gtk } from "ags/gtk4";
import { Wallpaper } from "../../modules/wallpaper";
import Runner from "..";
import { createRoot, jsx } from "ags";
import ResultItem from "../widgets/ResultItem";
import Fuse, { IFuseOptions } from "fuse.js";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import Cache from "../../modules/cache";
import Image from "../../widget/Image";


export class PluginWallpapers implements Runner.Plugin {
    prefix = "#";
    name = "Wallpapers";
    prioritize = true;
    #fuse!: Fuse<string>;
    #files!: Array<Gio.FileInfo>;
    #dir: string = Wallpaper.getDefault().wallpapersDir.peek_path()!;
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
        if(dir.query_file_type(Gio.FileQueryInfoFlags.NONE, null) === Gio.FileType.DIRECTORY) {
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
        Cache.getDefault().removeItem("wallpapers", "last"); // unrefs the cached GdkTexture
    }

    private loadPreview(path: string, revealer: Gtk.Revealer): void {
        const image = revealer.get_child() as Image ?? jsx(Image, {
            path,
            cache: ["wallpapers", "last"],
            css: "margin-bottom: 6px; border-radius: 10px;",
            heightRequest: 128
        });

        image.picture.set_hexpand(true);
        image.picture.set_content_fit(Gtk.ContentFit.COVER);
        image.picture.set_keep_aspect_ratio(false);

        if(!revealer.get_child())
            revealer.set_child(image);

        if(image.file === null)
            image.path = path;

        revealer.set_reveal_child(true);
    }

    private getWallpaperPath(fileInfo: Gio.FileInfo): string {
        return `${Wallpaper.getDefault().wallpapersDir.peek_path()!}/${
            this.#subdir ? `${this.#subdir}/` : ""
        }${fileInfo.get_name()}`;
    }

    private result(info: Gio.FileInfo): Runner.Result {
        const isDir: boolean = info.get_file_type() === Gio.FileType.DIRECTORY;
        const path: string = this.getWallpaperPath(info);

        const onSelected = (widget: ResultItem) => {
            if(info.get_file_type() === Gio.FileType.DIRECTORY)
                return;

            this.loadPreview(path, (widget.get_child() as Gtk.Box).get_first_child() as Gtk.Revealer);
        };

        const onUnselected = (widget: ResultItem) => {
            if(info.get_file_type() === Gio.FileType.DIRECTORY)
                return;

            const revealer = (widget.get_child() as Gtk.Box).get_first_child() as Gtk.Revealer;

            revealer.set_reveal_child(false);
            (revealer.get_child() as Image).texture = null;
        };

        return {
            title: `${info.get_display_name()}${isDir ? "/" : ""}`,
            icon: isDir ? "inode-directory-symbolic" : undefined,
            closeOnClick: !isDir,
            $: (self) => {
                if(isDir || !GLib.file_test(path, GLib.FileTest.EXISTS))
                    return;

                const revealer = new Gtk.Revealer({
                    transitionType: Gtk.RevealerTransitionType.SWING_UP,
                    transitionDuration: 400
                });

                const box = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL
                });

                box.prepend(revealer);
                const resultBox = self.get_child() as Gtk.Box;
                self.set_child(box);
                box.append(resultBox);
            },
            onSelected: (self) => onSelected(self),
            onUnselected: (self) => onUnselected(self),
            onHovered: (self) => onSelected(self),
            onUnhovered: (self) => onUnselected(self),
            onClicked: () => {
                if(isDir) {
                    Runner.setSearch(
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

            results.push(createRoot((dispose) => {
                const widget = this.result(info);
                widget.onDestroy = () => dispose();

                return widget;
            }));
        });


        if(results.length < 1)
            return {
                title: "No results found",
                description: "Wallpaper with provided name was not found :("
            } satisfies Runner.Result;

        return results;
    }
}
