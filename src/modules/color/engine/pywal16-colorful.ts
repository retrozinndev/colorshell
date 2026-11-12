import { register } from "ags/gobject";
import ColorEngine from ".";
import Pywal16 from "./pywal16";


@register({ GTypeName: "ColorEnginePywal16Colorful" })
export default class Pywal16Colorful extends Pywal16 {
    protected walToColors(wal: Pywal16.Wal): ColorEngine.Colors {
        const { special, colors } = wal;
        const bgPrimary = `oklch(from ${colors.color1} calc(l - .36) c h)`,
            bgSecondary = `oklch(from ${colors.color2} calc(l - .22) c h)`,
            bgTertiary = `oklch(from ${colors.color3} calc(l - .1) c h)`;

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
