import { Scope } from "ags";
import { createScopedConnection, encoder } from "../modules/utils";

import windows from "./modules/windows";
import volume from "./modules/volume";
import devel from "./modules/devel";
import media from "./modules/media";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


export namespace Cli {
    let rootScope: Scope;
    let service: Gio.SocketService;
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
        onCalled: (value?: string) => void;
    };

    export type Command = {
        /** the command name to be called.
            * @example `colorshell ${prefix?} ${command.name}`*/
        name: string;
        help?: string;
        /** data passed to the command. (only works when arguments are disabled) */
        data?: string;
        arguments?: Array<Argument>;
        onCalled: (args: Array<string>, data?: string) => Output;
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
    export function init(scope: Scope, socketService: Gio.SocketService): void {
        if(initialized) return;

        initialized = true;
        rootScope = scope;
        service = socketService;
        DEVEL && modules.push(devel);

        scope.run(() => {
            createScopedConnection(
                service, "incoming", (conn) => {
                    try {
                        return handleIncoming(conn);
                    } catch(_) {}

                    return false;
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
                    handleArgs(parsedArgs!);

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

    /** translate app arguments to modules/commands */
    function handleArgs(args: Array<string>): void {
        let mod: Module;
    }
}
