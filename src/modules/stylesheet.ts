import { monitorFile, readFile, writeFileAsync } from "ags/file";
import { decoder } from "./utils";
import { execAsync } from "ags/process";
import { Wallpaper } from "./wallpaper";
import { Shell } from "../app";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


/** handles stylesheet compiling and reloading */
export class Stylesheet {
    private static instance: Stylesheet;
    #outputPath = Gio.File.new_for_path(`${GLib.get_user_cache_dir()}/colorshell/style`);
    #stylesPaths: Array<string>;
    readonly #sassStyles = {
        modules: ["sass:color"].map(mod => `@use "${mod}";`).join('\n'),
        colors: "",
        mixins: "",
        rules: ""
    };
    public get stylePath() { return this.#outputPath.get_path()!; }


    public static getDefault(): Stylesheet {
        if(!this.instance)
            this.instance = new Stylesheet();

        return this.instance;
    }

    private bundle(): string {
        return `${this.#sassStyles.modules}\n\n${this.#sassStyles.colors
            }\n${this.#sassStyles.mixins}\n${this.#sassStyles.rules}`.trim();
    }

    private async compile(): Promise<void> {
        const sass = this.bundle();
        await writeFileAsync(`${this.stylePath}/sass.scss`, sass).catch(_e => {
            const e = _e as Error;
            console.error(`Stylesheet: Couldn't write Sass to cache. Stderr: ${
                e.message}\n${e.stack}`);
        });
        await execAsync(
            `bash -c "sass ${this.stylePath}/sass.scss ${this.stylePath}/style.css"`
        ).catch(_e => {
            const e = _e as Error;
            console.error(`Stylesheet: An error occurred on compile-time! Stderr: ${
                e.message}\n${e.stack}`);
        });
    }

    public getStyleSheet(): string {
        return readFile(`${this.stylePath}/style.css`);
    }

    public getColorDefinitions(): string {
        const data = Wallpaper.getDefault().getData();
        const colors = {
            ...data.special,
            ...data.colors
        };

        return Object.keys(colors).map(name =>
            `$${name}: ${colors[name as keyof typeof colors]};`
        ).join('\n');
    }

    private organizeModuleImports(sass: string) {
        return sass.replaceAll(
            /[@](use|forward|import) ["'](.*)["']?[;]?\n/gi, 
            (_, impType, imp) => {
                imp = (imp as string).replace(/["';]/g, "");

                // add sass modules on top
                if(!this.#sassStyles.modules.includes(imp) && /^(sass|.*http|.*https)/.test(imp))
                    this.#sassStyles.modules = this.#sassStyles.modules.concat(`\n@${impType} "${imp}";`);

                return "";
            }
        ).replace(/(colors|mixins|wal)\./g, "");
    }

    public compileApply(): void {
        this.compile().then(() => {
            Shell.getDefault().resetStyle();
            Shell.getDefault().applyStyle(this.getStyleSheet());
        }).catch(_e => {
            const e = _e as Error;
            console.error(`Stylesheet: An error occurred at compile-time. Stderr: ${
                e.message}\n${e.stack}`);
        });
    }

    private getStyleData(path: string): string {
        return decoder.decode(Gio.resources_lookup_data(path, null).get_data()!);
    }

    constructor() {
        if(!this.#outputPath.query_exists(null)) 
            this.#outputPath.make_directory_with_parents(null);

        this.#stylesPaths = Gio.resources_enumerate_children(
            "/io/github/retrozinndev/colorshell/styles", null
        ).map(name => 
            `/io/github/retrozinndev/colorshell/styles/${name}`
        );

        // Rules won't change at runtime in a common build, 
        // so no need to worry about this. 
        // But in a development build, there should be support
        // hot-reloading the gresource, this is a TODO
        this.#stylesPaths.forEach(path => {
            const name = path.split('/')[path.split('/').length - 1];

            switch(name) {
                case "colors":
                    this.#sassStyles.colors = `${this.getColorDefinitions()}\n${
                        this.organizeModuleImports(this.getStyleData(path))
                    }`;
                break;
                case "mixins":
                    this.#sassStyles.mixins = `${this.organizeModuleImports(
                        this.getStyleData(path)
                    )}`;
                break;

                default:
                    this.#sassStyles.rules = `${this.#sassStyles.rules}\n${
                        this.organizeModuleImports(this.getStyleData(path))
                    }`;
                break;
            }
        });

        this.compileApply();

        monitorFile(`${GLib.get_user_cache_dir()}/wal/colors`, () => {
            this.#sassStyles.colors = `${this.getColorDefinitions()}\n${
                this.organizeModuleImports(this.getStyleData(
                    "/io/github/retrozinndev/colorshell/styles/colors"
                ))
            }`;
            this.compileApply();
        });
    }
}
