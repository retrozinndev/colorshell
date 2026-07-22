import { Gdk, Gtk } from "ags/gtk4";
import { register, signal } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Wallpaper from "./wallpaper";
import Color from "./color";


/** handles stylesheet (re)loading and color transformations */
@register({ GTypeName: "ClshStyleManager" })
class StyleManager extends GObject.Object {
    declare $signals: StyleManager.SignalSignatures;
    private static instance: StyleManager|null = null;

    #colorsStyle: Gtk.CssProvider|null = null;
    #styles: Set<Gtk.CssProvider> = new Set();

    @signal()
    colorsUpdated() {}


    /** @param resourceNames optional list resource names to read and apply styles from */
    constructor(resourceNames?: Array<string>) {
        super();

        Wallpaper.getDefault().connect("wallpaper-changed", (_, image: Gio.File) => {
            Color.getEngine().getColorsAsync(image).then(colors => {
                this.setColors(colors);
            }).catch(console.error);
        });
        Color.getDefault().connect("updated", () => {
            Color.getEngine().getColorsAsync(Wallpaper.getDefault().wallpaper!)
                .then(colors => this.setColors(colors))
                .catch(console.error);
        });
        
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

        this.setColors(
            Color.getEngine().getColors(Wallpaper.getDefault().wallpaper!)
        );
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

    /** get the default instance for `StyleManager` */
    public static getDefault(): StyleManager {
        return this.init();
    }

    public setColors(colors: Color.Engine.Colors): void {
        if(this.#colorsStyle)
            this.remove(this.#colorsStyle);

        this.#colorsStyle = this.addCss(
`:root{
${Object.keys(colors).map(name =>
    `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${colors[name as keyof typeof colors]};`
).join('\n')}
}`
        );
        this.emit("colors-updated");
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

    public reload(): void {
        this.reset(true);
        this.#styles.forEach(css => Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default()!,
            css,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        ));
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
        "colors-updated": () => void;
    }
}

export default StyleManager;
