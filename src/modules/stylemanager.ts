import { Gdk, Gtk } from "ags/gtk4";
import { register, signal } from "ags/gobject";
import { readFile } from "ags/file";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import Wallpaper from "./wallpaper";
import { exec, execAsync } from "ags/process";


/** handles stylesheet (re)loading and color transformations */
@register({ GTypeName: "ClshStyleManager" })
class StyleManager extends GObject.Object {
    declare $signals: StyleManager.SignalSignatures;
    private static instance: StyleManager|null = null;
    /** `Wallpaper`'s ::`wallpaper-changed` and `notify::color-mode` connections */
    protected connections: [number, number]|null = null;

    #colorsStyle: Gtk.CssProvider|null = null;
    #styles: Set<Gtk.CssProvider> = new Set();

    @signal()
    colorsReloaded() {}


    /** @param resourceNames optional list resource names to read and apply styles from */
    constructor(resourceNames?: Array<string>) {
        super();

        this.connections = [
            Wallpaper.getDefault().connect("wallpaper-changed", () => {
                this.generateColorsAsync().then(() =>
                    this.reloadColors()
                ).catch(console.error);
            }),
            Wallpaper.getDefault().connect("notify::color-mode", () => {
                this.generateColorsAsync().then(() =>
                    this.reloadColors()
                ).catch(console.error);
            })
        ];
        
        if(!resourceNames || resourceNames.length < 1)
            return;

        for(const res of resourceNames) {
            const css = Gtk.CssProvider.new();

            this.#styles.add(css);
            css.load_from_resource(res);
        }

        for(const css of this.#styles.values()) {
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default()!,
                css,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );
        }

        this.reloadColors();
    }

    /** initialize a default instance for `StyleManager` */
    public static init(): StyleManager {
        if(!this.instance)
            this.instance = new StyleManager(
                Gio.resources_enumerate_children(
                    "/io/github/retrozinndev/Colorshell/css",
                    Gio.ResourceLookupFlags.NONE
                ).sort((res) => res.includes("main") ? 0 : 1) // main is loaded first
                .map(res => `/io/github/retrozinndev/Colorshell/css/${res}`)
            );

        return this.instance;
    }

    /** shutdown the default `StyleManager` instance and restore default theming */
    public static deinit(): void {
        if(!this.instance)
            return;

        this.instance.reset();
        this.instance.connections?.forEach(id => Wallpaper.getDefault().disconnect(id));
        this.instance.connections = null;
        this.instance = null;
    }

    /** get the default instance for `StyleManager` */
    public static getDefault(): StyleManager {
        return this.init();
    }

    /** generate colors from current wallpaper with pywal16 */
    public generateColors(): void {
        const wallpaper = Wallpaper.getDefault().wallpaper;
        if(!wallpaper)
            return;

        try {
            exec(`wal -t --cols16 "${Wallpaper.getDefault().colorMode}" -i "${wallpaper.peek_path()}"`);
        } catch(e) {
            throw new Error(`An error occurred while trying to generate colors: ${(e as Error).message}`);
        }
    }

    /** asynchronous version of `StyleManager.generateColors()` */
    public async generateColorsAsync(): Promise<void> {
        const wallpaper = Wallpaper.getDefault().wallpaper;
        if(!wallpaper)
            return;

        try {
            await execAsync(`wal -t --cols16 "${Wallpaper.getDefault().colorMode}" -i "${wallpaper.peek_path()}"`);
        } catch(e) {
            throw new Error(`An error occurred while trying to generate colors: ${(e as Error).message}`);
        }
    }


    /** reset all of the styles in this `StyleManager` instance (use default user theme)
      * @param keepRegistered whether to only remove the styling from the display and keeping it registered (default: false) */
    protected reset(keepRegistered: boolean = false): void {
        for(const css of this.#styles)
            Gtk.StyleContext.remove_provider_for_display(Gdk.Display.get_default()!, css);

        if(keepRegistered)
            return;

        this.#styles.clear();
    }

    /** remove a `GtkCssProvider` from the installed styles in the main `GdkDisplay`.
      * @param provider the `GtkCssProvider` to be removed
      *
      * @returns `true` if `provider` got removed successfully, or else, `false` */
    protected remove(provider: Gtk.CssProvider): boolean {
        if(!this.#styles.has(provider))
            return false;

        try {
            Gtk.StyleContext.remove_provider_for_display(
                Gdk.Display.get_default()!,
                provider
            );
        } catch(e) {
            console.error(e);
            return false;
        }

        return true;
    }

    /** create a `GtkCssProvider` from `stylesheet` and add it to the main `GdkDisplay`
      * @param stylesheet a valid css string 
      * @returns the created `GtkCssProvider` */
    protected addCss(stylesheet: string): Gtk.CssProvider {
        const provider = Gtk.CssProvider.new();
        this.#styles.add(provider);
        provider.load_from_string(stylesheet);
        
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default()!,
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );

        return provider;
    }

    public reloadColors(): void {
        if(this.#colorsStyle)
            this.remove(this.#colorsStyle);

        this.#colorsStyle = this.addCss(this.getColorsStyle());
        this.emit("colors-reloaded");
    }

    /** get pywal colors in the js `object` format */
    public getData(): StyleManager.WalColors {
        return JSON.parse(
            readFile(`${GLib.get_user_cache_dir()}/wal/colors.json`)
        ) as StyleManager.WalColors;
    }

    public reload(): void {
        this.reset(true);
        this.#styles.forEach(css => Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default()!,
            css,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        ));
    }

    /** gets the pywal-generated stylesheet that declares color variables.
      * @returns a string containing ready-to-use pywal color declarations in CSS */
    protected getColorsStyle(): string {
        try {
            return readFile(`${GLib.get_user_cache_dir()}/wal/colors.css`);
        } catch(e) {
            console.warn("Failed to load pywal colors. Let's regenerate them!");
            try {
                this.generateColors();
                return this.getColorsStyle();
            } catch(e) {
                console.error("Couldn't load pywal colors:", e);
                console.warn("Since there is no pywal colors set, styling may be broken");
                return "";
            }
        }
    }
}

namespace StyleManager {
    export type WalColors = {
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

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        /** emitted when the shell colors are reloaded */
        "colors-reloaded": () => void;
    }
}

export default StyleManager;
