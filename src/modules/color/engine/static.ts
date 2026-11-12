import Gio from "gi://Gio?version=2.0";
import GObject from "gi://GObject?version=2.0";
import { gtype, property, register } from "ags/gobject";
import { generalConfig } from "../../../config";
import ColorEngine from ".";


@register({ GTypeName: "ColorEngineStatic" })
class Static extends GObject.Object implements ColorEngine {
    declare readonly $signals: ColorEngine.SignalSignatures;

    @property(gtype<ColorEngine.Colors|null>(Object))
    colors: ColorEngine.Colors|null = null;

    @property(gtype<ColorEngine.Scheme>(Number))
    scheme: ColorEngine.Scheme = ColorEngine.Scheme.DARK;

    @property(String)
    backend: ColorEngine.Backend|string = "default";

    private readColors(): ColorEngine.Colors {
        const configured = generalConfig.getProperty("color.static", "object") as
            Record<string, unknown>|undefined;
        const getColor = (name: string): string => {
            const value = configured?.[name];
            if(typeof value !== "string" || value.trim() === "")
                throw new Error(`Static color engine requires a non-empty CSS value for "color.static.${name}"`);

            return value;
        };

        return {
            bgPrimary: getColor("bg_primary"),
            bgSecondary: getColor("bg_secondary"),
            bgTertiary: getColor("bg_tertiary"),
            bgTranslucentPrimary: getColor("bg_translucent_primary"),
            bgTranslucentSecondary: getColor("bg_translucent_secondary"),
            bgTranslucentTertiary: getColor("bg_translucent_tertiary"),
            fgPrimary: getColor("fg_primary"),
            fgDisabled: getColor("fg_disabled")
        };
    }

    getColors(_image: Gio.File): ColorEngine.Colors {
        return this.colors = this.readColors();
    }

    async getColorsAsync(image: Gio.File): Promise<ColorEngine.Colors> {
        return this.getColors(image);
    }
}

export default Static;
