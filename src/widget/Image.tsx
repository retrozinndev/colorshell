import { getter, gtype, property, register, setter, signal } from "ags/gobject";
import { Gdk, Gtk } from "ags/gtk4";
import { omitObjectKeys } from "../modules/utils";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";
import Gly from "gi://Gly?version=2";
import GLib from "gi://GLib?version=2.0";
import GlyGtk4 from "gi://GlyGtk4?version=2";
import Cache from "../modules/cache";


/** wrapper around GtkPicture that loads images asynchronously, showing an
  * `AdwSpinner` while doing so.
  * if you're using the `cache` feature here, please note that you'll have to
  * manually clear it later. */
@register({ GTypeName: "ClshImage" })
class Image extends Adw.Bin {
    #loaded: boolean = false;
    #stack: Gtk.Stack;
    #picture: Gtk.Picture;
    #texture: Gdk.Texture|null = null;
    #cancellable: Gio.Cancellable|null = null;
    #file: Gio.File|null = null;
    #cache: Image.CacheProperties|null = null;

    @signal()
    protected loadingCancelled() {}

    @signal(GLib.Error)
    protected loadingFailed(_: GLib.Error) {}

    @signal()
    protected loadingFinished() {}

    protected get canCache(): boolean {
        return Boolean(this.#cache && this.#file);
    }

    @setter(gtype<Gdk.Texture|null>(Gdk.Texture))
    set texture(newTexture: Gdk.Texture|null) {
        this.#texture = newTexture;
        this.notify("texture");

        this.setPaintable(newTexture);
        if(newTexture) {
            !this.is_visible() && this.show();
            this.#stack.set_visible_child_name("picture");
        } else if(this.hideIfEmpty)
            this.hide();
    }

    @getter(gtype<Gio.File|null>(Gio.File))
    get file() { return this.#file; }

    @setter(gtype<Gio.File|null>(Gio.File))
    set file(newFile: Gio.File|null) {
        if(!newFile) {
            this.setPaintable(null);
            this.notify("texture");
            this.notify("file");
            return;
        }

        this.#file = newFile;
        this.notify("file");
        this.load(newFile).catch(console.error);
    }

    @getter(gtype<string|null>(String))
    get path() { return this.#file?.peek_path() || null; }

    @setter(gtype<string|null>(String))
    set path(newPath: string|null) {
        if(newPath === null) {
            this.setPaintable(null);
            this.notify("texture");
            this.notify("path");
            return;
        }

        this.#file = Gio.File.new_for_path(newPath);
        this.notify("file");
        this.notify("path");

        this.load(this.#file).catch(console.error);
    }

    @getter(gtype<string|null>(String))
    get uri() {
        return this.#file && /.*\:\/\//.test(this.#file.get_uri()) ?
            this.#file.get_uri()
        : null;
    }

    @setter(gtype<string|null>(String))
    set uri(newUri : string|null) {
        if(newUri === null) {
            this.setPaintable(null);
            this.notify("texture");
            this.notify("uri");
            return;
        }

        this.#file = Gio.File.new_for_uri(newUri);
        this.notify("file");
        this.notify("uri");

        this.load(this.#file).catch(console.error);
    }

    /** automatically hide the widget if there's no image loaded */
    @property(Boolean)
    hideIfEmpty: boolean = false;

    /** save the loaded texture into a `Cache` section:key.
      * only works if `:file`, `:uri` or `:path` is set */
    @getter(gtype<Image.CacheProperties|null>(Array))
    get cache() { return this.#cache; }

    /** the texture of the image that is being rendered */
    @getter(gtype<Gdk.Texture|null>(Gdk.Texture))
    get texture() { return this.#texture; }

    /** picture widget that handles image rendering */
    @getter(gtype<Gtk.Picture|null>(Gtk.Picture))
    get picture() { return this.#picture; }

    /** whether the image's finished loading */
    @getter(Boolean)
    get loaded() { return this.#loaded; }


    constructor(props: Partial<Image.ConstructorProps> = {}) {
        super({
            cssName: "clshimage",
            ...omitObjectKeys(props, [
                "path",
                "file",
                "texture",
                "hideIfEmpty",
                "cache"
            ])
        });       

        if(props.hideIfEmpty !== undefined)
            this.hideIfEmpty = props.hideIfEmpty;

        // since its construct-only, we can just check it once
        if(props.cache !== undefined && props.cache.length === 2 && 
           props.cache.every(v => typeof v === "string")) {
            this.#cache = props.cache;
        }

        this.#stack = Gtk.Stack.new();
        this.#picture = props.texture ?
            Gtk.Picture.new_for_paintable(this.#texture)
        : Gtk.Picture.new();

        this.#stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE);
        this.#stack.add_named(Adw.Spinner.new(), "spinner");
        this.#stack.add_named(this.#picture, "picture");
        this.#stack.set_visible_child_name("spinner");

        if(props.texture !== undefined && !this.picture.get_paintable()) {
            this.#texture = props.texture;
            this.#loaded = true;
        } else if(props.path !== undefined && props.path !== null)
            this.load(Gio.File.new_for_path(props.path))
                .catch(console.error);
        else if(props.file)
            this.load(props.file).catch(console.error);
        else {
            this.#loaded = true;
            this.hideIfEmpty && this.hide();
        }

        // add widget
        this.set_child(this.#stack);
    }

    protected async load(file: Gio.File): Promise<void> {
        const cached = this.getCached();
        if(cached) {
            this.texture = cached[1];
            return;
        }

        this.#loaded = false;
        this.notify("loaded");

        this.#stack.set_visible_child_name("spinner");

        return new Promise((resolve, reject) => {
            this.#cancellable = Gio.Cancellable.new();
            this.#cancellable.connect(() => {
                resolve();
                this.#stack.set_visible_child_name("picture");
                this.emit("loading-cancelled");
            });

            const loader = Gly.Loader.new(file);
            loader.load_async(this.#cancellable, (_, res) => {
                if(!this.#cancellable)
                    return;

                let img: Gly.Image|undefined;
                try {
                    img = loader.load_finish(res);
                } catch(e) {
                    reject(e);
                    this.#stack.set_visible_child_name("picture");
                    this.#cancellable = null;
                    this.emit("loading-failed", e as GLib.Error);
                    return;
                }

                img.next_frame_async(null, (_, res) => {
                    let texture: Gdk.Texture|undefined;
                    try {
                        texture = GlyGtk4.frame_get_texture(
                            img.next_frame_finish(res)
                        );
                    } catch(e) {
                        reject(e);
                        this.#stack.set_visible_child_name("picture");
                        this.#cancellable = null;
                        this.emit("loading-failed", e as GLib.Error);

                        return;
                    }

                    this.texture = texture;
                    this.#loaded = true;
                    this.notify("loaded");
                    resolve();

                    if(this.canCache) {
                        // add to cache
                        Cache.getDefault().addItem<Image.CacheData>(
                            this.#cache![0], [this.#file!, this.#texture!], this.#cache![1]
                        );
                    }
                });
            });
        });
    }

    protected getCached(): Image.CacheData|null {
        if(!this.canCache)
            return null;
        
        const cached = Cache.getDefault().getItem<Image.CacheData>(...this.#cache!) ?? null;

        if(!cached || !cached[0].equal(this.#file!))
            return null;

        return cached;
    }

    protected setPaintable(paintable: Gdk.Paintable|null): void {
        this.#picture.set_paintable(paintable);
    }

    /** cancel image loading operation (if its running) */
    protected cancel(): void {
        if(!this.#cancellable)
            return;

        this.#cancellable?.cancel();
        this.#cancellable = null;
    }

    get_layout_manager(): Gtk.BinLayout {
        return super.get_layout_manager()!;
    }

    connect<S extends keyof Image.SignalSignatures>(
        signal: S,
        callback: (self: Image, ...params: Parameters<Image.SignalSignatures[S]>) => ReturnType<Image.SignalSignatures[S]>
    ): number {
        return super.connect(signal, callback);
    }

    emit<S extends keyof Image.SignalSignatures>(
        signal: S,
        ...args: Parameters<Image.SignalSignatures[S]>
    ): void {
        super.emit(signal, ...args);
    }
}

namespace Image {
    export interface ConstructorProps extends Adw.Bin.ConstructorProps {
        cache: Image.CacheProperties;
        path: string|null;
        file: Gio.File|null;
        uri: string|null;
        hideIfEmpty: boolean;
        texture: Gdk.Texture|null;
    }
    export interface SignalSignatures extends Adw.Bin.SignalSignatures {
        "notify::loaded": () => void;
        "notify::texture": () => void;
        "notify::file": () => void;
        "notify::path": () => void;
        "notify::uri": () => void;
        "notify::hide-if-empty": () => void;
        "loading-cancelled": () => void;
        "loading-finished": () => void;
        "loading-failed": (error: GLib.Error) => void;
    }

    /** [section, key] */
    export type CacheProperties = [string, string];
    export type CacheData = [Gio.File, Gdk.Texture];
}

export default Image;
