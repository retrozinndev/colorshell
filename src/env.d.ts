declare const SRC: string
declare const DEVEL: boolean;
declare const GRESOURCES_FILE: string;
declare const COLORSHELL_VERSION: string;

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
