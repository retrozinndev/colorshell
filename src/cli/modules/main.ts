import GLib from "gi://GLib?version=2.0";
import Cli from "..";
import { showWorkspaceNumber } from "../../window/bar/widgets/Workspaces";
import Windows from "../../window";
import { Shell } from "../../app";
import System from "system";
import { execApp } from "../../modules/apps";
import { generalConfig } from "../../config";
import { runtimeDir } from "../../modules/utils";
import Runner from "../../runner";


const defaultPeekMillis = 2200;
let peekMillis: number = defaultPeekMillis,
    peekTimeout: GLib.Source|undefined;
const windowArg = {
    name: "window",
    alias: 'w',
    hasValue: true,
    help: "Select a window to control from the window list (check `colorshell windows` command)",
    onCalled: (remote, name) => {
        if(typeof name !== "string") {
            remote.println("Error: no window name provided. Please see `colorshell windows`", true);
            remote.exit(1);
            return;
        }

        if(!Windows.getDefault().hasWindow(name)) {
            remote.println(
                `Specified name "${name}" is not a valid window name.\nTry checking \`colorshell windows\``,
                true
            );
            return;
        }
    }
} satisfies Cli.Argument;

export default {
    help: `\
Manage colorshell's windows, features and get extra info.
Made using GTK4, AGS, Gnim and Astal libraries.

Window Management:
  windows: list all the available windows and their states
  reopen: close all of the currently-open windows and re-open them
  open -w [name]: open the window with "name"
  close -w [name]: close an already-open window with "name"
  toggle -w [name]: toggle-open a window with "name"(closes if open, opens if closed)

Audio Controls:
  volume: speaker and microphone volume controller, see "volume --help"

Media Controls:
  media: manage colorshell's active player, see "media --help"
${DEVEL ? `
Development Tools:
  dev: tools to help debugging colorshell. see "dev --help"
` : ""}
Others:
  runner: open the application runner, see "runner --help"
  run --cmd app[.desktop]: run applications from the cli, see "run --help"
  lock: quick-lock your user with hyprlock
  screenshot: take a screenshot. see "screenshot --help"
  peek-workspaces: peek the workspace numbers in the "bar" window. see "peek-workspaces --help"
  reload: restart current colorshell instance. see "reload --help"
  quit: exit the main instance of the shell
  -v, --version[-detailed]: display current colorshell version.
  -h, --help: shows this help message.

2026 (c) retrozinndev, licensed under the BSD 3-Clause License.
https://github.com/retrozinndev/colorshell
`.trimEnd(),

    arguments: [
        {
            name: "version",
            alias: "v",
            help: "Show the version number of colorshell",
            onCalled: (remote) => {
                remote.println(`Colorshell ${VERSION} ${DEVEL ? "(dev) " : ""}`);
                remote.exit(0);
            }
        }, {
            name: "version-detailed",
            alias: "V",
            help: "Show the version of this colorshell build, with detailed info",
            onCalled: (remote) => {
                remote.println(`Colorshell ${VERSION}${DEVEL ? " (dev)" : ""}`);
                remote.println(`Built from from HEAD "${HEAD}", at ${GLib.DateTime.new_from_unix_local(BUILD_DATE).format_iso8601()}`);
                remote.println("(c) 2026 Colorshell, made by retrozinndev. https://github.com/retrozinndev/colorshell");
                remote.exit(0);
            }
        }
    ],
    commands: [
        {
            name: "open",
            help: "Open the selected window, if it's closed",
            arguments: [windowArg],
            onCalled: (remote, args) => {
                const name = args.find(a => a.name === "window")!.value;

                if(!Windows.getDefault().isOpen(name as never)) {
                    remote.println(`Opening window: ${name}`);
                    try {
                        Windows.getDefault().open(name as never);
                    } catch(e) {
                        remote.println(`Error: Couldn't open window: ${(e as Error).message}`, true);
                        remote.exit(1);
                    }
                    remote.exit(0);
                    return;
                }

                remote.println(`Window with name "${name}" is already open`, true);
                remote.exit(1);
            }
        }, {
            name: "toggle",
            help: "Toggle open/close the selected window",
            arguments: [windowArg],
            onCalled: (remote, args) => {
                const name = args.find(a => a.name === "window")!.value;

                if(!Windows.getDefault().isOpen(name as never)) {
                    remote.println(`Opening window: ${name}`);
                    try {
                        Windows.getDefault().open(name as never);
                    } catch(e) {
                        remote.println(`Error: Couldn't open window: ${(e as Error).message}`, true);
                        remote.exit(1);
                    }
                    remote.exit(0);
                    return;
                }

                remote.println(`Closing window: ${name}`);
                try {
                    Windows.getDefault().close(name as never);
                } catch(e) {
                    remote.println(`Error: Couldn't close window: ${(e as Error).message}`, true);
                    remote.exit(1);
                }
            }
        }, {
            name: "close",
            help: "Close the selected window if it's open",
            arguments: [windowArg],
            onCalled: (remote, args) => {
                const name = args.find(a => a.name === "window")!.value;

                if(Windows.getDefault().isOpen(name as never)) {
                    remote.println(`Closing window: ${name}`);
                    try {
                        Windows.getDefault().close(name as never);
                    } catch(e) {
                        remote.println(`Error: Couldn't close window: ${(e as Error).message}`, true);
                        remote.exit(1);
                    }
                    remote.exit(0);
                    return;
                }

                remote.println(`Window with name "${name}" is already closed`, true);
                remote.exit(1);
            }
        }, {
            name: "windows",
            onCalled: (remote) => {
                remote.println(Object.keys(Windows.getDefault().windows).map(name =>
                    `${name}: ${Windows.getDefault().isOpen(name as never) ? "open" : "closed"}`
                ).join('\n'));
            }
        }, {
            name: "reopen",
            onCalled: (remote) => {
                remote.println("Reopening all currently-open widgets");
                try {
                    Windows.getDefault().reopen();
                } catch(e) {
                    remote.println(`Error: Failed to complete action: ${(e as Error).message}`);
                    remote.exit(1);
                    return;
                }

                remote.exit(0);
            }
        },
        // others
        {
            name: "runner",
            help: "Toggle the multifunctional runner (apps, clipboard, shell, wallpaper controls...)",
            arguments: [{
                name: "text",
                alias: "t",
                help: "Initial text for the runner search entry",
                hasValue: true
            }],
            onCalled: (remote, args) => {
                const text = args.find(a => a.name === "text")?.value;
                remote.println(`Toggling runner${text ? ` with "${text}"` : ""}...`);

                Runner.isOpen ?
                    Runner.close()
                : Runner.open(text);
                remote.exit(0);
            }
        },
        {
            name: "lock",
            help: "Quick-lock your session using colorshell's themed hyprlock.",
            onCalled: (remote) => {
                remote.println("Locking session...");
                execApp(
                    `hyprlock --config ${runtimeDir.peek_path()!}/config/hyprlock.conf`
                );
                remote.exit(0);
            }
        },
        {
            name: "run",
            arguments: [
                {
                    name: "command",
                    alias: 'c',
                    help: "Specify the command to be ran by colorshell. Also supports desktop entries!",
                    hasValue: true
                },
                {
                    name: "alias",
                    alias: 'a',
                    help: "Run the specified alias' command",
                    hasValue: true
                },
                {
                    name: "rules",
                    alias: 'r',
                    help: `Add window rules to the app window(if there's any).
Format: https://wiki.hypr.land/Configuring/Dispatchers/#executing-with-rules`,
                    hasValue: true,
                    onCalled: (remote, v) => {
                        if(!v || /^\[(.*[;]?)*\]$/.test(v)) {
                            remote.println("Error: Invalid window rules format provided", true);
                            remote.exit(1);
                        }
                    }
                }
            ],
            onCalled: (remote, args) => {
                const alias = args.find(a => a.name === "alias")?.value as string;
                const cmd = args.find(a => a.name === "command")?.value as string;
                const rules = args.find(a => a.name === "rules")?.value as string;
                let command: string|undefined;


                if(alias !== undefined) {
                    const aliasCommand = generalConfig.getProperty(`aliases.${alias}`, "string");

                    if(aliasCommand === undefined) {
                        remote.println(`Error: Command for alias "${alias}" not found. Please add it to your config before using!`);
                        remote.exit(1);
                        return;
                    }

                    command = aliasCommand;
                    remote.println(`Executing command alias: ${alias}`);
                } else if(cmd !== undefined) {
                    command = cmd;
                    remote.println(`Executing ${cmd.endsWith(".desktop") ?
                        "desktop entry"
                    : "command"}...`);
                }

                if(command === undefined) {
                    remote.println("Error: No command provided. Please, either provide --alias or --command", true);
                    remote.exit(1);
                    return;
                }

                execApp(command, rules);
            }
        },
        {
            name: "peek-workspaces",
            arguments: [{
                name: "millis",
                alias: 'm',
                help: "Set a custom timeout in milliseconds to peek workspace numbers. (default: 2200ms/2.2s)",
                hasValue: true,
                onCalled: (remote, value) => {
                    const millis = value !== undefined ?
                        Number.parseInt(value.replace(/[a-z]/gi, ""))
                    : undefined;

                    if(Number.isNaN(millis)) {
                        remote.println(`Provided millis parameter "${value}" is not a valid number.`, true);
                        remote.exit(1);
                        return;
                    }

                    peekMillis = millis!;
                }
            }],
            help: "Peek the workspace numbers in the workspace indicator. (optional: time in millis)",
            onCalled: (remote) => {
                showWorkspaceNumber(true);

                peekTimeout ??= setTimeout(() => {
                    showWorkspaceNumber(false);
                    peekTimeout = undefined;
                }, peekMillis);

                remote.println("Peeking workspace IDs...");
                remote.exit(0);
            }
        },
        {
            name: "reload",
            help: "Quits the currently-open instance and starts another one",
            onCalled: (remote) => {
                if(System.programPath === null)
                    remote.println("Error: argv[0](program path) is unset, reloading might not work correctly");

                const path = System.programPath ?? `${GLib.get_user_runtime_dir()}/colorshell/colorshell`;

                Shell.getDefault().quit();
                GLib.spawn_async(null, [path], null, GLib.SpawnFlags.SEARCH_PATH, null);
                System.exit(0);
            }
        },
        {
            name: "quit",
            help: "exits the current instance of colorshell",
            onCalled: (remote) => {
                Shell.getDefault().quit();
                remote.println("Quitting...");
                remote.exit(0);
                System.exit(0);
            }
        }
    ]
} satisfies Cli.Module;
