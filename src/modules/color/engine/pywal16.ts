import GObject from "gi://GObject?version=2.0";
import ColorEngine from ".";
import Gio from "gi://Gio?version=2.0";
import { gtype, property, register, setter } from "ags/gobject";
import { cacheDir, isInstalled } from "../../utils";
import { exec, execAsync } from "ags/process";
import { readFile, readFileAsync } from "ags/file";


// known issue: apps like kitty will have their color updated when not intended
// currently not a real problem, since it's a feature; it'll only turn into a 
// problem when we start using this system to generate colorschemes for other
// stuff than the wallpaper
@register({ GTypeName: "ColorEnginePywal16" })
class Pywal16 extends GObject.Object implements ColorEngine {
    declare readonly $signals: ColorEngine.SignalSignatures;
    #backend: Pywal16.Backend = "wal";
    #path: Gio.File = Gio.File.new_for_path(`${cacheDir.peek_path()!}/colorends/pywal16`);

    /** last-generated wal palette */
    @property(gtype<Pywal16.Wal|null>(Object))
    wal: Pywal16.Wal|null = null;

    @property(gtype<ColorEngine.Colors|null>(Object))
    colors: ColorEngine.Colors|null = null;

    @property(gtype<ColorEngine.Scheme>(Number))
    scheme: ColorEngine.Scheme = ColorEngine.Scheme.DARK;

    get backend() { return this.#backend; }
    @setter(String)
    set backend(backend: Pywal16.Backend) {
        if(backend !== "wal" && backend !== "colorthief" && backend !== "colorz" &&
            backend !== "okthief" && backend !== "haishoku" && backend !== "fast_colorthief" &&
            backend !== "modern_colorthief"
        ) {
            backend !== "default" &&
                console.warn(`Unsupported pywal16 backend: "${backend}". Falling back to default "wal"`);

            backend = "wal";
        }

        this.#backend = backend;
        (this as Pywal16).notify("backend");
    }

    constructor() {
        super();

        if(!this.#path.query_exists(null))
            this.#path.make_directory_with_parents(null);
    }

    /** exec pywal command to gen colorscheme with current properties */
    protected generate(image: Gio.File): Pywal16.Wal {
        if(!isInstalled("wal"))
            throw new Error("Pywal16 not found in PATH, ensure that the \"wal\" binary is executable and in PATH");

        exec(`/bin/env wal --out-dir "${
            this.#path.peek_path()!
        }" -t --cols16 ${this.scheme === ColorEngine.Scheme.LIGHT ?
            "-l" : ""
        } --backend ${
            this.#backend
        } -i "${
            image.peek_path()
        }"`);

        return this.wal = JSON.parse(readFile(
            `${this.#path.peek_path()!}/colors.json`
        )) as Pywal16.Wal;
    }

    async generateAsync(image: Gio.File): Promise<Pywal16.Wal> {
        if(!isInstalled("wal"))
            throw new Error("Pywal16 not found in PATH, ensure that the \"wal\" binary is executable and in PATH");

        await execAsync(`/bin/env wal --out-dir "${
            this.#path.peek_path()!
        }" -t --cols16 ${this.scheme === ColorEngine.Scheme.LIGHT ?
            "-l" : ""
        } --backend ${
            this.#backend
        } -i "${
            image.peek_path()
        }"`);

        return this.wal = JSON.parse(await readFileAsync(
            `${this.#path.peek_path()!}/colors.json`
        )) as Pywal16.Wal;
    }

    getColors(image: Gio.File): ColorEngine.Colors {
        if(!image.query_exists(null))
            throw new Error("Couldn't generate color scheme: image not found or inaccessible");

        return this.colors = this.walToColors(this.generate(image));
    }

    async getColorsAsync(image: Gio.File) {
        if(!image.query_exists(null))
            throw new Error("Couldn't generate color scheme: image not found or inaccessible");

        return this.colors = this.walToColors(await this.generateAsync(image));
    }

    // TODO better colors
    /** convert `Pywal16.Wal` to a valid `ColorEngine.Colors` object */
    protected walToColors(wal: Pywal16.Wal): ColorEngine.Colors {
        const { special, colors } = wal;
        const bgPrimary = `oklch(from ${colors.color1} calc(l - .36) c h)`,
            bgSecondary = `oklch(from ${colors.color1} calc(l - .22) c h)`,
            bgTertiary = `oklch(from ${colors.color1} calc(l - .1) c h)`;

        return {
            bgPrimary,
            bgSecondary,
            bgTertiary,
            bgTranslucentPrimary: `oklch(from ${bgPrimary} l c h / .68)`,
            bgTranslucentSecondary: `oklch(from ${bgSecondary} l c h / .68)`,
            bgTranslucentTertiary: `oklch(from ${bgTertiary} l c h / .68)`,
            fgPrimary: special.foreground,
            fgDisabled: `oklch(from ${special.foreground} calc(l - .10) c h)`
        };
    }
}

namespace Pywal16 {
    export type Backend = ColorEngine.Backend
        |"colorthief"
        |"colorz"
        |"haishoku"
        |"okthief"
        |"wal"
        |"fast_colorthief"
        |"modern_colorthief"
    ;

    export type Wal /* jSON 😭🥀🥀 */ = {
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
}

export default Pywal16;
