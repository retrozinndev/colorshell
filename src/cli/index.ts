import { Scope } from "ags";
import { createScopedConnection, decoder, encoder } from "../modules/utils";

import main from "./modules/main";
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
        main,
        volume,
        media
    ];

    export type Output = {
        type: "err"|"out";
        content: string|Uint8Array;
    };

    type PrintFunction = (output: Output) => void;

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
        /** data passed to the argument if it accepts a value
          * (accessed in command's `onCalled` method) */
        value?: string;
        /** help message for the argument */
        help?: string;
        onCalled?: (print: PrintFunction, value?: string) => void;
    };

    export type Command = {
        /** the command name to be called.
            * @example `colorshell ${prefix?} ${command.name}`*/
        name: string;
        help?: string;
        arguments?: Array<Argument>;
        onCalled: (print: PrintFunction, args: Array<Argument>) => void;
    };

    export type Module = {
        /** command to come after the cli call.
            * @example `colorshell ${prefix?} ${command}`*/
        prefix?: string;
        commands?: Array<Command>;
        arguments?: Array<Argument>;
        help?: string;
        /** called everytime the prefix is used, even when using module commands */
        onCalled?: (print: PrintFunction, command?: Command) => void;
    };

    /** initialize the cli */
    export function init(scope: Scope, method: Gio.SocketService|Gio.ApplicationCommandLine, app?: Gio.Application): void {
        if(initialized) return;

        initialized = true;
        rootScope = scope;
        DEVEL && modules.push(devel);

        scope.run(() => {
            if(method instanceof Gio.SocketService) {
                createScopedConnection(
                    method, "incoming", (conn) => {
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
                        handle(
                            cmd.get_arguments().toSpliced(0, 1), 
                            (out) => {
                                const str = typeof out.content !== "string" ?
                                    decoder.decode(out.content)
                                : out.content;

                                if(out.type === "err") {
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
                    handle(parsedArgs!, (out) => {
                        conn.outputStream.write_bytes(
                            typeof out.content === "string" ?
                                encoder.encode(out.content)
                            : out.content
                        );
                    });

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
    * order: module ?args command ?args 
    * @example media(module) --player=spotify(arg) pause(command) */
    function handle(args: Array<string>, print: PrintFunction): void {
        const commandArgs: Array<Argument> = [];
        const moduleArgs: Array<Argument> = [];
        let mod: Module = modules[0];
        let command: Command|undefined;

        /** @returns true if handled argument used the next parameter as a value */
        function handleArgument(cmd: Module|Command, args: Array<string>, index: number): boolean {
            if(cmd.arguments === undefined || cmd.arguments.length < 1 || !isArgument(args[index]))
                return false;

            // full argument
            if(args[index].startsWith("--")) {
                for(const arg of cmd.arguments) {
                    if(arg.name === args[index].replace(/^--/, "")) {
                        command ?
                            commandArgs.push(arg)
                        : moduleArgs.push(arg);

                        if(arg.hasValue) {
                            // support in-argument values
                            if(args[index].includes('=')) {
                                const value = args[index].split('=', 1).filter(s => s !== "");
                                arg.value = value[1];
                                arg.onCalled?.(print, arg.value);

                                return false;
                            }

                            arg.value = args[index+1];
                            if(arg.value !== undefined) {
                                arg.onCalled?.(print, arg.value);
                                return true;
                            }

                            print({
                                content: `Error: no data provided for argument ${arg.name} from command ${command?.name ?? mod.prefix}`,
                                type: "err"
                            });
                            return false;
                        }

                        arg.onCalled?.(print);
                        break;
                    }
                }
                
                print({
                    content: `Error: no such argument "${args[index]}" for command ${command?.name ?? mod?.prefix}`,
                    type: "err"
                });
                return false;
            }

            // it's an argument alias(e.g.: -h -> --help)
            for(const arg of cmd.arguments) {
                if(arg.alias === args[index].replace(/^-/, "")) {
                    command ?
                        commandArgs.push(arg)
                    : moduleArgs.push(arg);

                    if(arg.hasValue) {
                        arg.value = extractValueFromArgument(args[index]);
                        if(arg.value !== undefined) {
                            arg.onCalled?.(print, arg.value);
                            return false;
                        }

                        arg.value = args[index+1];
                        if(arg.value !== undefined) {
                            arg.onCalled?.(print, arg.value);
                            return true;
                        }

                        print({
                            content: `Error: no data provided for argument ${arg.name} from command ${command?.name ?? mod.prefix}`,
                            type: "err"
                        });
                        return false;
                    }

                    arg.onCalled?.(print);
                    break;
                }
            }

            print({
                content: `Error: no such argument "${args[index]}" for command ${command?.name ?? mod?.prefix}`,
                type: "err"
            });
            return false;
        }

        const firstFoundMod = modules.filter(mod => mod.prefix === args[0])[0];

        if(firstFoundMod) {
            // remove now-unnecessary module reference
            args.splice(0, 1);
            mod = firstFoundMod;
        }

        if(!mod) {
            print({
                content: `Error: no matching command with name ${args[0]}!`,
                type: "err"
            });
            return;
        }

        // we use this to skip checking next argument when it's 
        // used as a parameter to another argument/flag
        let skip: boolean = false;

        for(let i = 1; i < args.length; i++) {
            const arg = args[i];

            if(skip) {
                skip = false;
                continue;
            }

            if(isArgument(arg)) {
                if(/-?-h(elp)?/.test(arg)) {
                    print({
                        content: (command ?? mod).help ?? "No help defined for this command",
                        type: "out"
                    });
                }
                skip = handleArgument(command ?? mod, args, i);
                continue;
            }



            // TODO: support modules and module commands
            const foundCommand = mod.commands?.filter(m => m.name === arg)[0];
            if(!command && foundCommand) {
                command = foundCommand;
            }
        }

        // call module and command onCalled methods after doing argument parsing and shi
        mod.onCalled?.(print, command);
    }

    function isArgument(str: string): boolean {
        return /^-(-)?/.test(str);
    }

    function extractValueFromArgument(arg: string): string|undefined {
        return arg.includes('=') ?
            arg.split('=', 1).filter(s => s !== "")[1]
        : undefined;
    }

    function outputToString(out: Output|string): string {
        if(typeof out === "object")
            return out.content instanceof Uint8Array ?
                decoder.decode(out.content)
            : out.content;

        return out;
    }
}
