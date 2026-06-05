import { getter, gtype, property, register, setter } from "ags/gobject";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject?version=2.0";


/** translators: just append your language module import in this object! */
const i18nKeys = {
    en_US: (await import("./lang/en_US")).default,
    fr_FR: (await import("./lang/fr_FR")).default,
    fr_BE: (await import("./lang/fr_FR")).default,
    pt_BR: (await import("./lang/pt_BR")).default,
    ru_RU: (await import("./lang/ru_RU")).default,
    tr_TR: (await import("./lang/tr_TR")).default,
    jp_JP: (await import("./lang/jp_JP")).default,
};


@register({ GTypeName: "ClshI18n" })
class I18n extends GObject.Object {
    declare $signals: I18n.SignalSignatures;
    private static instance: I18n;
    private systemLang: string|null = null;

    #languages: Array<I18n.Language> = Object.keys(i18nKeys) as Array<I18n.Language>;
    #language: I18n.Language = this.#languages[0];
    
    /** language to fall back to if an error occurs in the translation of a string or
      * unavailability of the user's language in the shell. 
      * @default `"en_US"` */
    @property(String)
    fallback: I18n.Language = this.#languages[0];

    /** all of the available translations in the shell */
    @getter(gtype<Array<I18n.Language>>(String))
    get languages() { return this.#languages; }

    @setter(String)
    set language(newLang: I18n.Language) {
        const lang = this.#languages.find(l => l === newLang);
        if(lang === undefined) {
            console.error(`I18n: Couldn't change language to ${newLang}: language is not in the languages list`);
            return;
        }

        this.#language = newLang;
        this.notify("language");
    }
    @getter(gtype<I18n.Language>(String))
    get language() { return this.#language; }


    /** initialize the internationalization system.
      * also adds the `tr` function to the global context, for easier access */
    public static init(): I18n {
        if(!this.instance) {
            this.instance = new I18n();

            Object.assign(globalThis, {
                tr: (key: string) => this.instance.translate(key)
            });
        }
        
        return this.instance;
    }
    
    constructor(language?: I18n.Language, fallback?: I18n.Language) {
        super();

        if(this.hasLanguage(this.getSystemLang()))
            this.language = this.systemLang as I18n.Language;

        if(language !== undefined)
            this.language = language;

        if(fallback !== undefined)
            this.fallback = fallback;
    }

    public static getDefault(): I18n {
        return this.init();
    }

    
    /** checks if `lang` is available to be used(has translations)
      * @param lang the language name (e.g.: pt_BR, en_US)
      * @returns `true` if `lang` is available in the language list, otherwise, `false` */
    public hasLanguage(lang: string|I18n.Language): boolean {
        return this.#languages.includes(lang as I18n.Language);
    }

    /** @returns the system's $LANG variable, without the encoding info (e.g.: pt_BR, en_US) */
    public getSystemLang(): string {
        this.systemLang ??= (GLib.getenv("LANG") ?? GLib.getenv("LANGUAGE") ?? "")
            .split('.')[0];

        if(!/^([a-z]){2}_([A-Z]){2}$/.test(this.systemLang)) {
            console.warn(`I18n: Couldn't parse system language "${this.systemLang}". Falling back to "${this.fallback}"`);
            return this.fallback;
        }

        if(!this.hasLanguage(this.systemLang)) {
            console.log(`I18n: Your system language "${this.systemLang}" is not available for colorshell. \
Consider contributing with a translation if you can ;D`);
        }

        return this.systemLang;
    }

    /** get a translation string from the current language.
      * if the string is not found, it falls back to the `fallback` language
      *
      * @returns the translated string if found, otherwise `"no_tr_string"` */
    public translate(string: string): string {
        let result: string|object|null = this.getLangObject(),
            defResult: string|object|null = this.getLangObject(this.fallback);

        for(const keyString of string.split(".")) {
            try {
                result = result?.[keyString as keyof typeof result] ?? null;
            } catch(e) {
                result = null;
            }

            try {
                defResult = defResult?.[keyString as keyof typeof defResult] ?? null;
            } catch(e) {
                console.error("Failed to get default translation string:", e);
                defResult = null;
            }
        }

        return typeof result == "string" ?
            result
        : typeof defResult == "string" ?
            defResult
        : "no_tr_string";
    }


    /** get the translation object for a specific `language`.
      *
      * @param language the language you want to get the object for (default: `fallback`)
      * @returns an object containing the language's translation strings */
    public getLangObject(language?: I18n.Language): object {
        return i18nKeys[language ?? this.language];
    }
}

namespace I18n {
    export type Language = keyof typeof i18nKeys;

    export interface ConstructorProps extends GObject.Object.ConstructorProps {}
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        "notify::fallback": () => void;
        "notify::languages": () => void;
        "notify::language": () => void;
    }
}

export default I18n;
