import { Gtk } from "ags/gtk4";
import Wallpaper from "../../modules/wallpaper";
import Runner from "..";
import { createRoot, jsx } from "ags";
import ResultItem from "../widgets/ResultItem";
import Fuse from "fuse.js";
import Gio from "gi://Gio?version=2.0";
import Image from "../../widget/Image";


export class PluginWallpapers implements Runner.Plugin {
    prefix = "#";
    name = "Wallpapers";
    prioritize = true;
    previewSize: number = 156;
    rootSeparator: string = ':'; // please do not create cursed dirs with colons :pray:
    #isSubdir: boolean = false;
    #rootEntries: Array<PluginWallpapers.Wallpaper|PluginWallpapers.Subdirectory> = [];
    #fuse = new Fuse<PluginWallpapers.Wallpaper|PluginWallpapers.Subdirectory>([], {
        keys: ["name"],
        useExtendedSearch: false,
        shouldSort: true,
        isCaseSensitive: false
    });

    constructor() {
    }

    init() {
        if(Object.keys(Wallpaper.getDefault().dirs).length < 1) {
            console.error("Wallpaper: no directories provided to search");
            return;
        }

        for(const dir of Object.values(Wallpaper.getDefault().dirs)) {
            if(dir.query_file_type(Gio.FileQueryInfoFlags.NONE, null) !== Gio.FileType.DIRECTORY) {
                console.error(`Wallpaper: "${dir.peek_path()}" isn't a directory`);
                continue;
            }

            if(!dir.query_exists(null)) {
                console.warn(`Wallpaper: "${dir.peek_path()}" does not exist`);
                continue;
            }

            for(const info of this.getDirChildren(dir))
                this.#rootEntries.push(this.fileInfoToEntry(dir, info));

        }

        this.#fuse.setCollection(this.#rootEntries);
    }

    private scan(dir: Gio.File): Array<PluginWallpapers.Wallpaper|PluginWallpapers.Subdirectory> {
        const list = [];
        for(const info of this.getDirChildren(dir))
            list.push(this.fileInfoToEntry(dir, info));
        
        return list;
    }

    private getDirChildren(dir: Gio.File): Array<Gio.FileInfo> {
        const list: Array<Gio.FileInfo> = [];

        for(const info of dir.enumerate_children("standard::*", Gio.FileQueryInfoFlags.NONE, null))
            list.push(info);

        return list;
    }

    private fileInfoToEntry(dir: Gio.File, info: Gio.FileInfo): PluginWallpapers.Subdirectory|PluginWallpapers.Wallpaper {
        const isDir = info.get_file_type() === Gio.FileType.DIRECTORY;
        const path = `${dir.peek_path()}/${info.get_name()}`;

        if(isDir) {
            const duplicate = this.#fuse._docs.find(o => o.name === info.get_name()) as PluginWallpapers.Subdirectory|undefined;
            if(duplicate)
                duplicate.name = `${duplicate.rootDir.get_basename()}:${duplicate.name}`;

            return {
                name: `${duplicate ? dir.get_basename()!+":": ""}${info.get_name()}`,
                dir: Gio.File.new_for_path(path),
                rootDir: dir,
                info
            } satisfies PluginWallpapers.Subdirectory;
        }

        return {
            name: info.get_name(),
            file: Gio.File.new_for_path(path),
            info
        } satisfies PluginWallpapers.Wallpaper;
    }

    private loadPreview(entry: PluginWallpapers.Wallpaper, revealer: Gtk.Revealer): void {
        const image = revealer.get_child() as Image ?? jsx(Image, {
            css: "margin-bottom: 6px; border-radius: 14px;",
            hexpand: true,
            overflow: Gtk.Overflow.HIDDEN,
            hideIfEmpty: false,
            heightRequest: this.previewSize
        });

        if(image.texture === null)
            image.file = entry.file;

        image.picture.set_content_fit(Gtk.ContentFit.COVER);
        image.picture.set_can_shrink(true);

        if(!revealer.get_child())
            revealer.set_child(image);

        revealer.set_reveal_child(true);
    }

    private result(entry: PluginWallpapers.Wallpaper|PluginWallpapers.Subdirectory): Runner.Result {
        const isSubdir = this.isSubdirectory(entry);
        const onSelected = (widget: ResultItem, scroll: boolean = true) => {
            if(isSubdir)
                return;

            if(scroll)
                Runner.open().requestScroll(widget.get_allocation().y - this.previewSize);

            this.loadPreview(entry, (widget.get_child() as Gtk.Box).get_first_child() as Gtk.Revealer);
        };

        const onUnselected = (widget: ResultItem, isMouse: boolean = false) => {
            // this is also called on ResultItem::unhover, so we need to check if it's selected
            if(isSubdir || (widget.is_selected() && isMouse))
                return;

            const revealer = (widget.get_child() as Gtk.Box).get_first_child() as Gtk.Revealer;

            revealer.set_reveal_child(false);
            revealer.connect("notify::child-revealed", () => {
                if(revealer.get_child_revealed())
                    return;

                (revealer.get_child() as Image).unload().catch(console.error);
            });
        };

        return {
            title: `${entry.name}${isSubdir ? "/" : ""}`,
            icon: isSubdir ? "inode-directory-symbolic" : undefined,
            closeOnClick: !isSubdir,
            $: (self) => {
                if(isSubdir || !entry.file.query_exists(null))
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
            onHovered: (self) => onSelected(self, false),
            onUnhovered: (self) => onUnselected(self, true),
            onUnrealize: (self) => {
                const img = (self.get_child()!.get_first_child() as Gtk.Revealer)?.get_child() as Image;
                if(!img)
                    return;

                img.texture = null;
            },
            onClicked: () => {
                if(isSubdir) {
                    Runner.setSearch(`${this.prefix}${this.subdirToString(entry)}`);
                    return;
                }

                if(!entry.file.query_exists(null))
                    return;

                Wallpaper.getDefault().wallpaper = entry.file;
            }
        };
    }

    async handle(search: string, limit: number = 0) {
        if(this.#fuse._docs.length < 1) 
            return {
                title: "No wallpapers found!",
                description: "Define the WALLPAPERS env variable or create ~/wallpapers",
                icon: "image-missing-symbolic"
            } satisfies Runner.Result;

        let subdir: PluginWallpapers.Subdirectory|undefined;
        
        if(search.length < 1)
            return this.#fuse._docs.slice(0, limit-1).map(entry => this.result(entry));

        if(this.isSubdirectoryString(search)) {
            const split = search.split('/').filter(s => s !== "");
            search = !search.endsWith('/') ? split.splice(split.length-1, 1)![0] ?? "" : "";
            subdir = this.stringToSubdir(`${split.join('/')}`) ?? undefined;

            if(subdir) {
                this.#isSubdir = true;
                this.#fuse.setCollection(this.scan(subdir.dir));
            }
        } else if(this.#isSubdir) {
            this.#fuse.setCollection(this.#rootEntries);
        }

        const results = this.#fuse.search(search, { limit: limit || -1 })
            .map(entry => createRoot((dispose) => {
                const widget = this.result(entry.item);
                widget.onDestroy = () => dispose();

                return widget;
            }));

        if(results.length < 1)
            return {
                title: "No results found",
                description: "Wallpaper with provided name was not found :("
            } satisfies Runner.Result;

        return results;
    }

    private subdirToString(subdir: PluginWallpapers.Subdirectory): string {
        const name = Object.keys(Wallpaper.getDefault().dirs).find(p =>
            Wallpaper.getDefault().dirs[p as never].equal(subdir.rootDir)
        );

        return `${name}:${
            subdir.dir.peek_path()!.replace(subdir.rootDir.peek_path()!+"/", "")
        }/`;
    }

    private stringToSubdir(str: string): PluginWallpapers.Subdirectory|null {
        const [root, sub] = str.split(':', 2);
        const rootDir = Wallpaper.getDefault().dirs[root];

        if(!rootDir)
            return null;

        const dir = Gio.File.new_for_path(`${rootDir.peek_path()}/${sub.replace(/\/$/, "")}`);
        if(!dir.query_exists(null))
            return null;

        return this.#fuse._docs.find(entry =>
            this.isSubdirectory(entry) && entry.dir.equal(dir)
        ) as PluginWallpapers.Subdirectory|undefined ?? null;
    }

    isSubdirectory(
        entry: PluginWallpapers.Wallpaper|PluginWallpapers.Subdirectory
    ): entry is PluginWallpapers.Subdirectory {
        return "rootDir" in entry && "dir" in entry;
    }

    isSubdirectoryString(str: string): boolean {
        return /^.+\:.+\//i.test(str);
    }

    isWallpaper(
        entry: PluginWallpapers.Wallpaper|PluginWallpapers.Subdirectory
    ): entry is PluginWallpapers.Wallpaper {
        return "file" in entry;
    }
}

export namespace PluginWallpapers {
    export interface Wallpaper {
        name: string;
        file: Gio.File;
        info: Gio.FileInfo;
    }
    export interface Subdirectory {
        name: string;
        dir: Gio.File;
        /** from which one of the wallpaper dirs it originates from */
        rootDir: Gio.File;
        info: Gio.FileInfo;
    }
}
