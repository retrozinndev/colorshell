// handles stylesheet compiling and reloading

import { monitorFile, AstalIO, timeout, GLib, Gio, execAsync, exec, readFile } from "astal";
import { App } from "astal/gtk3";

export class Stylesheet {
    private static instance: Stylesheet;
    #watchDelay: (AstalIO.Time|undefined);
    #outputPath = Gio.File.new_for_path(`${GLib.get_user_state_dir()}/ags/style`);
    #styles = [
        "./style",
        "./style.scss"
    ];

    public compileSass(): void {
        console.log("Stylesheet: Compiling Sass");

        exec(`bash -c "sass ${this.#styles.map(style => `-I ${style}`).join('\s')
            } ${this.#outputPath.get_path()!}/style.css"`);
    }

    public async reapply(cssFilePath: string): Promise<void> {
        console.log("Stylesheet: Applying stylesheet");

        const content = readFile(cssFilePath);

        if(content) {
            App.reset_css();
            App.apply_css(content);

            console.log("Stylesheet: done applying stylesheet to shell");
            return;
        }

        console.error(`Stylesheet: An error occurred while trying to read the css file: ${
            cssFilePath}`);
    }

    public async compileApply(): Promise<void> {
        this.compileSass();
        this.reapply(this.#outputPath.get_path()! + "/style.css");
    }

    public static getDefault(): Stylesheet {
        if(!this.instance)
            this.instance = new Stylesheet();

        return this.instance;
    }

    constructor() {
        (async () => !this.#outputPath.query_exists(null) && 
            this.#outputPath.make_directory_with_parents(null))();

        this.#styles.map((path: string) =>
            monitorFile(
                `${path}`,
                (file: string) => {
                    if(this.#watchDelay || file.endsWith('~') || Number.isNaN(file)) 
                        return;

                    this.#watchDelay = timeout(250, () => this.#watchDelay = undefined);
                    console.log(`Stylesheet: \`${file.startsWith(GLib.get_home_dir()) ? 
                            file.replace(GLib.get_home_dir(), '~')
                        : file}\` changed`)

                    this.compileApply();
                }
            )
        )

        monitorFile(
            `${GLib.get_user_cache_dir()}/wal/colors.scss`,
            (file: string) => {
                execAsync(`bash -c "cp -f ${file} ./style/_wal.scss"`).catch(r => {
                    console.error(`Stylesheet: Failed to copy pywal stylesheet to style dir. Stderr: ${r}`);
                });
            }
        );
    }
}
