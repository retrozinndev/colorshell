import { execAsync } from "ags/process";
import { escapeSpecialCharacters, isInstalled, translateDirWithEnvironment } from "../../modules/utils";
import { Runner } from "../Runner";
import { Notifications } from "../../modules/notifications";
import GLib from "gi://GLib?version=2.0";


type RipGrepJSON = {
    type: "begin"|"match"|"end"|"summary";
    data: {
        path: { text: string; };
        lines?: {
            text: string;
        };
        stats?: {
            elapsed: {
                secs: number;
                nanos: number;
                human: string;
            };
            searches: number;
            searches_with_match: number;
        };
        binary_offset?: number|null;
        
    };
};

type Item = {
    isDir: boolean;
    isLink: boolean;
    isExecutable: boolean;
    path: string;
    name: string;
};

class _PluginFiles implements Runner.Plugin {
    #rgAvailable: boolean = false;
    #findAvailable: boolean = false;
    prefix = "/";
    prioritize = true;

    init() {
        // check if ripgrep is installed
        this.#rgAvailable = isInstalled("rg");
        this.#findAvailable = isInstalled("find");
    }

    async handle(search: string, limit: number = 30) {

        if(!this.#rgAvailable)
            return {
                title: "`ripgrep` not found",
                description: "Try installing `ripgrep` before using this feature",
                actionClick: () => execAsync("xdg-open 'https://github.com/BurntSushi/ripgrep'")
            } satisfies Runner.Result;
        
        if(search.length < 1)
            return 

        if(/^\//.test(search)) {
            search = translateDirWithEnvironment(search);

            if(!this.#findAvailable)
                return {
                    title: "`findutils` not found",
                    description: "Try installing GNU `findutils` before using this feature"
                } satisfies Runner.Result;

            return await this.find(search);
        }

        const str = escapeSpecialCharacters(search);
        const res = execAsync(["bash", "-c", `'rg --json "${search}" | head -n ${limit}'` ]);
        const jsons: Array<RipGrepJSON> = (await res)?.split('\n').map(ostr => JSON.parse(ostr));
    }

    private async find(path: string): Promise<Array<Runner.Result>> {
        const items: Array<Item> = (await execAsync(["find", path])).split('\n').map(item => ({
                isDir: GLib.file_test(item, GLib.FileTest.IS_DIR),
                isLink: GLib.file_test(item, GLib.FileTest.IS_SYMLINK),
                isExecutable: GLib.file_test(item, GLib.FileTest.IS_EXECUTABLE),
                path: item,
                name: item.split('/')[item.split('/').length - 1]
            }));

            return items.map(item => {
                if(item.isDir)
                    return {
                        title: item.name,
                        icon: "inode-directory-symbolic",
                        description: `Directory${item.isLink ? " (link)" : ""}`,
                        actionClick: () => Runner.setEntryText(`${this.prefix}${item.path}`),
                        closeOnClick: false
                    } satisfies Runner.Result;

                return {
                    title: item.name,
                    icon: "paper-symbolic",
                    description: `File${item.isExecutable ? " (executable)" : ""}${
                        item.isLink ? " (link)" : ""}`,
                    closeOnClick: true,
                    actionClick: () => execAsync(`xdg-open ${item.path}`).catch((e: Error) => {
                        Notifications.getDefault().sendNotification({
                            appName: "colorshell",
                            summary: "Error when opening file",
                            body: `The following error occurred while opening "${item.name
                                }" with XDG: ${e.message}`
                        });
                    })
                } satisfies Runner.Result;
            });
    }
}

export const PluginFiles = new _PluginFiles();
