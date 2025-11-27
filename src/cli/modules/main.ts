import GLib from "gi://GLib?version=2.0";
import { Cli } from "..";
import { showWorkspaceNumber } from "../../window/bar/widgets/Workspaces";
import { Windows } from "../../windows";


let window: string|undefined;
const defaultPeekMillis = 2200;
let peekMillis: number = defaultPeekMillis,
    peekTimeout: GLib.Source|undefined;
const windowArg: Cli.Argument = {
    name: "window",
    alias: 'w',
    help: "Select a window to control from the window list (check `colorshell windows` command)",
    onCalled: (print, name) => {
        if(!Windows.getDefault().hasWindow(name!)) {
            print({
                content: `Specified name "${name}" is not a valid window name.\nTry checking \`colorshell windows\``,
                type: "err"
            });
            window = undefined;
            return;
        }
    }
};

export default {
    help: "manage colorshell windows and do more cool stuff.",
    onCalled: () => window = undefined,
    arguments: [
        {
            name: "version",
            alias: "v",
            help: "Show the version number of colorshell",
            onCalled: () => `colorshell ${COLORSHELL_VERSION}${DEVEL ? " (dev build)" : ""}`
        }
    ],
    commands: [
        {
            name: "open",
            help: "Open the selected window, if it's closed",
            arguments: [windowArg],
            onCalled: (print, name) => {
                print({
                    type: "out",
                    content: "TODO"
                });
            }
        }, {
            name: "toggle",
            help: "Toggle open/close the selected window",
            arguments: [windowArg],
            onCalled: (_) => {
                return {
                    type: "out",
                    content: "TODO"
                }
            }
        }, {
            name: "close",
            help: "Close the selected window if it's open",
            arguments: [windowArg],
            onCalled: (_) => {
                
            }
        }, {
            name: "windows",
            onCalled: (print) => {
                print({
                    content: Object.keys(Windows.getDefault().windows).map(name =>
                        `${name}: ${Windows.getDefault().isOpen(name) ? 
                            "open"
                        : "closed"}`
                    ).join('\n'),
                    type: "out"
                });
            }
        }, {
            name: "reopen",
            onCalled: (print) => {
                print({
                    content: "Reopening all currently-open widgets",
                    type: "out"
                });
                Windows.getDefault().reopen();
            }
        },
        // others
        {
            name: "runner",
            arguments: [{
                name: "text",
                alias: "t",
                help: "Initial text for the runner search entry",
                hasValue: true
            }],
            onCalled: (print, args) => {
                const text = args[0]?.value;
                print({
                    content: `Opening runner${text ? ` with "${text}"` : ""}...`,
                    type: "out"
                });
            }
        },
        {
            name: "peek-workspace-num",
            arguments: [{
                name: "millis",
                alias: 'm',
                help: "Set a custom millis to peek workspace numbers",
                hasValue: true,
                onCalled: (print, value) => {
                    const millis = value !== undefined ? Number.parseInt(value) : undefined;

                    if(Number.isNaN(millis)) {
                        print({
                            content: `Provided millis parameter "${value}" is not a valid number.`,
                            type: "err"
                        });
                        return;
                    }

                    peekMillis = millis!;
                }
            }],
            help: "peek the workspace numbers in the workspace indicator. (optional: time in millis)",
            onCalled: () => {
                showWorkspaceNumber(true);

                peekTimeout ??= setTimeout(() => {
                    showWorkspaceNumber(false);
                    peekTimeout = undefined;
                }, peekMillis);

                return "Peeking workspace IDs...";
            }
        }
    ]
} satisfies Cli.Module;
