import { Scope } from "ags";
import { createScopedConnection, decoder, encoder } from "../modules/utils";
import { showWorkspaceNumber } from "../window/bar/widgets/Workspaces";

import windows from "./modules/windows";
import volume from "./modules/volume";
import devel from "./modules/devel";
import media from "./modules/media";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


/** cli implementation for colorshell */
export namespace Cli {
    let rootScope: Scope;
    let initialized: boolean = false;
    const modules: Array<Module> = [
        // main module, no need for prefix
        {
            help: "manage colorshell windows and do more cool stuff.",
            commands: [
                ...windows,
                // others
                {
                    name: "runner",
                    onCalled: (_, data) => {
                        return {
                            content: `Opening runner${data ? ` with "${data}"` : ""}...`,
                            type: "out"
                        };
                    }
                },
                {
                    name: "peek-workspace-num",
                    help: "peek the workspace numbers in the workspace indicator. (optional: time in millis)",
                    onCalled: () => {
                        showWorkspaceNumber(true);
                        return "Peeking workspace IDs...";
                    }
                }
            ],
            arguments: [
                {
                    name: "version",
                    alias: "v",
                    help: "print the current colorshell version",
                    onCalled: () => `colorshell by retrozinndev, version ${COLORSHELL_VERSION
                        }${DEVEL ? "(devel)" : ""}`
                }
            ]
        },
        volume,
        media
    ];

    export type Output = {
        type: "err"|"out";
        content: string|Uint8Array;
    } | string;

    /** argument passed to the command / module.
        * output of onCalled is passed to */
    export type Argument = {
        /** kebab-cased name for the argument(without the `--` prefix) 
            * @example help (turns into `--help` internally)*/
        name: string;
        /** alias for the name (without the `-` prefix).
            * @example help -> h */
        alias?: string;
        /** whether the argument needs a value attribute.
            * @example --file ~/a_nice_home_file.txt */
        hasValue?: boolean;
        /** runtime-set value for the argument(if enabled) */
        value?: string;
        /** help message for the argument */
        help?: string;
        onCalled?: (value?: string) => void;
    };

    export type ArgumentData = {
        argument: Argument;
        data?: string;
    };

    export type Command = {
        /** the command name to be called.
            * @example `colorshell ${prefix?} ${command.name}`*/
        name: string;
        help?: string;
        /** data passed to the command. (only works when arguments are disabled) */
        data?: string;
        arguments?: Array<Argument>;
        onCalled: (args: Array<ArgumentData>, data?: string) => Output;
    };

    export type Module = {
        /** command to come after the cli call.
            * @example `colorshell ${prefix?} ${command}`*/
        prefix?: string;
        commands?: Array<Command>;
        arguments?: Array<Argument>;
        help?: string;
        /** called everytime the prefix is used, even when using module commands */
        onPrefixCalled?: () => void;
    };

    /** initialize the cli */
    export function init(scope: Scope, communicationMethod: Gio.SocketService|Gio.ApplicationCommandLine, app?: Gio.Application): void {
        if(initialized) return;

        initialized = true;
        rootScope = scope;
        DEVEL && modules.push(devel);

        scope.run(() => {
            if(communicationMethod instanceof Gio.SocketService) {
                createScopedConnection(
                    communicationMethod, "incoming", (conn) => {
                        try {
                            return handleIncoming(conn);
                        } catch(_) {}

                        return false;
                    }
                );

                return;
            }

            if(!app) 
                throw new Error("GApplication not specified for GApplicationCommandLine communication method")
            if(app.flags !& Gio.ApplicationFlags.HANDLES_COMMAND_LINE)
                throw new Error("GApplication does not have the HANDLES_COMMAND_LINE flag or doesn't implement it")

            createScopedConnection(
                app,
                "command-line",
                (cmd) => {
                    let hasError: boolean = false;
                    try {
                        handleArgs(
                            cmd.get_arguments().toSpliced(0, 1), 
                            (str, type) => {
                                if(type === "err") {
                                    cmd.printerr_literal(str);
                                    hasError = true;
                                    return;
                                }

                                cmd.print_literal(str);
                            }
                        );
                    } catch(_) {
                        // TODO better error message
                        hasError = true;
                    }

                    return hasError ? 1 : 0;
                }
            );
        });
    }

    /** handle incoming socket calls */
    function handleIncoming(conn: Gio.SocketConnection): void {
        const inputStream = Gio.DataInputStream.new(conn.inputStream);

        inputStream.read_upto_async('\x00', -1, GLib.PRIORITY_DEFAULT, null, (_, res) => {
            const [args, len] = inputStream.read_upto_finish(res);
            inputStream.close(null);
            conn.inputStream.close(null);

            if(len < 1) {
                console.error(`Colorshell: No args provided via socket call`);
                return;
            }

            try {
                const [success, parsedArgs] = GLib.shell_parse_argv(`colorshell ${args}`);
                parsedArgs?.splice(0, 1); // remove the unnecessary `colorshell` part

                if(success) {
                    handleArgs(parsedArgs!, conn.outputStream);

                    conn.outputStream.flush(null);
                    conn.close(null);
                    return;
                }

                conn.outputStream.write_bytes(
                    encoder.encode("Error: Unexpected syntax error occurred"),
                    null
                );

                conn.outputStream.flush(null);
                conn.close(null);
            } catch(_e) {
                const e = _e as Error;
                console.error(`Colorshell: An error occurred while writing to socket output. Stderr:\n${
                    e.message}\n${e.stack}`);
            }
        });
    }

    /** translate app arguments to modules/commands 
    * order: module ?arg -> command ?arg */
    function handleArgs(args: Array<string>, writeTo: Gio.OutputStream|((str: string, type: "out"|"err") => void)): void {
        let mod: Module;
        let command: Command|undefined;
        const modArgs: Array<Argument> = [];
        const cmdArgs: Array<Argument> = [];

        function print(out: Output): void {
            const content = `${outputToString(out)}\n`;
            const type: "out"|"err" = typeof out === "object" ?
                out.type
            : "out";

            typeof writeTo === "function" ?
                writeTo(content, type)
            : writeTo.write_bytes(
                encoder.encode(`${outputToString(out)}\n`),
                null
            );
        }

        function handleCommandArguments(cmd: Module|Command, args: Array<string>, index: number, printFun: (out: Output) => void): void {
            const argNameRegEx = /^--/, argAliasRegEx = /^-/;
            let argName: string;

            if(args[index].startsWith("--")) {
                
            }
        }

        const firstFoundMod = modules.filter(mod => mod.prefix === args[0])[0];
        mod = firstFoundMod ?? modules[0];

        if(!mod) {
            print({
                content: `No command module found with the name ${args[0]}!`,
                type: "err"
            });
            return;
        }

        for(let i = 1; i < args.length; i++) {
            const arg = args[i];

            if(/^-/.test(arg)) {
                handleCommandArguments(command ?? mod, args, i, print);
                continue;
        }
    }

    function outputToString(out: Output): string {
        if(typeof out === "object")
            return out.content instanceof Uint8Array ?
                decoder.decode(out.content)
            : out.content;

        return out;
    }
}
