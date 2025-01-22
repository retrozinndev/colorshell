// handles reloading stylesheet and pywal colors

import { readFile, monitorFile, Process, Gio } from "astal";
import { App } from "astal/gtk3";
import { getUserDirs } from "./user";

const stylePath = `${getUserDirs().state}/ags/style`
const watchPaths = [
    "./style",
    "./style.scss"
];

export function runStyleHandler(): void {
    reloadStyle();
    watch();
}

export function reloadStyle(): void {
    compileStyle();
    applyStyle();
}

export function compileStyle(): void {
    console.log("[LOG] Compiling sass (stylesheet)");
    Process.exec(`mkdir -p ${stylePath}`);
    Process.exec(`bash -c "sass -I ./style ./style.scss ${stylePath}/style.css"`);
}

export function applyStyle(): void {
    console.log("[LOG] Applying stylesheet");
    App.reset_css();
    App.apply_css(
        readFile(`${stylePath}/style.css`)!
    );
}

function watch(): void {
    // Monitor changes on stylesheet at runtime
    watchPaths.map((path: string) =>
        monitorFile(
            `${path}`,
            (file: string) => {
                // Ignore tmp files
                if(!file.endsWith('~')) {
                    console.log(`[LOG] Stylesheet ${file} file updated`)
                    compileStyle();
                    applyStyle();
                }
            }
        )
    )

    // Monitor PyWal colorscheme file
    monitorFile(
        `${getUserDirs().cache}/wal/colors.scss`,
        (file: string) => {
            Process.exec(`bash -c "cp -f ${file} ./style/_wal.scss"`)
        }
    );
}
