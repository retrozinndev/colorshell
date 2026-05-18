declare const SRC: string
declare const DEVEL: boolean;
declare const GRESOURCES_FILE: string;
declare const COLORSHELL_VERSION: string;
declare const BUILD_DATE: number;
declare const HASH: string;


/** get a translation string from the current language.
  * if the string is not found, it falls back to the `fallback` language
  *
  * @returns the translated string if found, otherwise `"no_tr_string"` */
declare function tr(key: string): string;

declare module "inline:*" {
    const content: string
    export default content
}

declare module "*.scss" {
    const content: string
    export default content
}

declare module "*.blp" {
    const content: string
    export default content
}

declare module "*.css" {
    const content: string
    export default content
}
