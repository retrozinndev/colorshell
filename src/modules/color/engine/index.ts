import Gio from "gi://Gio?version=2.0";
import GObject from "gi://GObject?version=2.0";


interface ColorEngine extends GObject.Object {
    readonly $signals: ColorEngine.SignalSignatures;

    /** whether the color scheme should be `DARK` or `LIGHT`.
      * `DARK`(`0`) shoud be the default */
    scheme: ColorEngine.Scheme;
    /** color gen backend, if the engine provides this feature.
      * @default `"default"` */
    backend: ColorEngine.Backend|string;
    /** last-generated color scheme */
    colors: ColorEngine.Colors|null;

    getColors(image: Gio.File): ColorEngine.Colors;
    getColorsAsync(image: Gio.File): Promise<ColorEngine.Colors>;
}

namespace ColorEngine {
    export enum Scheme {
        DARK = 0,
        LIGHT = 1,
        AUTO = 2 // TODO
    }

    export interface Colors {
        bgPrimary: string;
        bgSecondary: string;
        bgTertiary: string;
        bgTranslucentPrimary: string;
        bgTranslucentSecondary: string;
        bgTranslucentTertiary: string;
        fgPrimary: string;
        fgDisabled: string;
    }

    export type Backend = "default";

    export namespace Format {
    }

    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify::scheme"(): void;
        "notify::backend"(): void;
    }
}

export default ColorEngine;
