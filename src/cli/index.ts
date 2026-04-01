import CliInterface from "./interface";
import main from "./modules/main";
import volume from "./modules/volume";
import devel from "./modules/devel";
import media from "./modules/media";
import screenshot from "./modules/screenshot";


const cliModules = [
    main,
    volume,
    media,
    screenshot
] satisfies Array<Cli.Module>;

// add development module when in dev mode
DEVEL && cliModules.push(devel);

/** cli implementation for colorshell 
 * (this is a big of a WIP, it's still using the old implementation in `modules/arg-handler`) */
export abstract class Cli {
    private static initialized: boolean = false;
    private static modules: Array<Cli.Module> = [];
    private static ifaces: Array<Cli.Interface> = [];


    /** initializes the cli.
      * @param ifaces list of `Cli.Interface` to add support cli calls 
      * @param modules list of `Cli.Module` to be added to the cli */
    public static init(ifaces?: Array<Cli.Interface>, modules: Array<Cli.Module> = cliModules): void {
        if(this.initialized)
            return;

        this.initialized = true;
        ifaces && ifaces.length > 0 && 
            this.ifaces.push(...ifaces);
        modules.length > 0 &&
            this.modules.push(...modules);

        this.ifaces.forEach(iface => {
            const id = iface.connect("received", (_, args, remote) => {
                this.handle(
                    args, 
                    remote
                );
            });

            id; // TODO disconnect this on scope dispose
        });
    }

    /** translate app arguments to modules/commands 
    * order: module ?args command ?args 
    * @example media(module) --player=spotify(arg) pause(command) */
    public static handle(args: Array<string>, remote: Cli.Remote): void {
        const commandArgs: Array<Cli.Argument> = [];
        const moduleArgs: Array<Cli.Argument> = [];
        let mod: Cli.Module = this.modules[0];
        let command: Cli.Command|undefined;

        /** @returns true if handled argument used the next parameter as a value */
        function handleArgument(cmd: Cli.Module|Cli.Command, args: Array<string>, index: number): boolean {
            if(cmd.arguments === undefined || cmd.arguments.length < 1 || !Cli.isArgument(args[index]))
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
                                arg.onCalled?.(remote, arg.value);

                                return false;
                            }

                            arg.value = args[index+1];
                            if(arg.value !== undefined) {
                                arg.onCalled?.(remote, arg.value);
                                return true;
                            }

                            remote.println(
                                `Error: no data provided for argument ${arg.name} from command ${command?.name ?? mod.prefix}`,
                                true
                            );
                            return false;
                        }

                        arg.onCalled?.(remote);
                        break;
                    }
                }
                
                remote.println(
                    `Error: no such argument "${args[index]}" for command ${command?.name ?? mod?.prefix}`,
                    true
                );
                return false;
            }

            // it's an argument alias(e.g.: -h -> --help)
            for(const arg of cmd.arguments) {
                if(arg.alias === args[index].replace(/^-/, "")) {
                    command ?
                        commandArgs.push(arg)
                    : moduleArgs.push(arg);

                    if(arg.hasValue) {
                        arg.value = Cli.extractValueFromArgument(args[index]);
                        if(arg.value !== undefined) {
                            arg.onCalled?.(remote, arg.value);
                            return false;
                        }

                        arg.value = args[index+1];
                        if(arg.value !== undefined) {
                            arg.onCalled?.(remote, arg.value);
                            return true;
                        }

                        remote.println(
                            `Error: no data provided for argument ${arg.name} from command ${command?.name ?? mod.prefix}`,
                            true
                        );
                        return false;
                    }

                    arg.onCalled?.(remote);
                    break;
                }
            }

            remote.println(
                `Error: no such argument "${args[index]}" for command ${command?.name ?? mod?.prefix}`,
                true
            );
            return false;
        }

        // where we're actually handling
        let firstFoundMod = this.modules.find(mod => mod.prefix === args[0]);

        if(firstFoundMod) {
            // remove now-unnecessary module reference
            args.splice(0, 1);
            mod = firstFoundMod;
        }

        firstFoundMod ??= this.modules[0]; // main module(0) fallback

        if(!mod) {
            remote.println(`Error: no matching command module with name ${args[0]}!`, true);
            remote.exit(1);
            return;
        }

        // we use this to skip checking next argument when it's 
        // used as a parameter to another argument/flag
        let skip: boolean = false;
        // index which the command was called
        let commandIndex: number|undefined;

        for(let i = 0; i < args.length; i++) {
            const arg = args[i];

            if(skip) {
                skip = false;
                continue;
            }

            if(this.isArgument(arg)) {
                if(/^(-)?h|(--)?help$/.test(arg)) {
                    remote.println((command?.help ?? mod?.help) ?? "No help defined for this command");
                    remote.exit(1);
                    return;
                }
                skip = handleArgument(command ?? mod, args, i);
                continue;
            }

            command ??= mod.commands?.filter(m => m.name === arg)[0];

            if(command === undefined) {
                remote.println(`Error: No such command "${arg}". Please check "${
                    mod.prefix !== undefined ? `${mod.prefix} ` : ""}--help"`, true);
                remote.exit(1);
                return;
            }

            commandIndex = i;
        }
        
        // call module and command onCalled methods after doing argument parsing and shi
        mod.onCalled?.(remote, command);

        // get all of the arguments after the command call
        const cmdArgs: Array<Cli.Argument> = [];
        if(command && commandIndex !== undefined && args.length > commandIndex) {
            args.splice(commandIndex+1, args.length).forEach(argStr => {
                if(!this.isArgument(argStr))
                    return;

                const rawArg = argStr.replace(/^(-|--)/, "");
                const foundArgument = command.arguments?.find(s =>
                    s.name === rawArg || s.alias === rawArg
                );
                if(foundArgument !== undefined)
                    cmdArgs.push(foundArgument);
            });
        }
        command?.onCalled(remote, cmdArgs);
    }

    private static isArgument(str: string): boolean {
        return /^-(-)?/.test(str);
    }

    private static extractValueFromArgument(arg: string): string|undefined {
        return arg.includes('=') ?
            arg.split('=', 1).filter(s => s !== "")[1]
        : undefined;
    }
}

export namespace Cli {
    export type Interface = CliInterface;
    export type Remote = CliInterface.Remote;

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
        onCalled?: (remote: Cli.Remote, value?: string) => void;
    };

    export type Command = {
        /** the command name to be called.
            * @example `colorshell ${prefix?} ${command.name}`*/
        name: string;
        help?: string;
        arguments?: Array<Cli.Argument>;
        onCalled: (remote: Cli.Remote, args: Array<Cli.Argument>) => void;
    };

    export type Module = {
        /** command to come after the cli call.
            * @example `colorshell ${prefix?} ${command}`*/
        prefix?: string;
        commands?: Array<Cli.Command>;
        arguments?: Array<Cli.Argument>;
        help?: string;
        /** called everytime the prefix is used, even when using module commands */
        onCalled?: (remote: Cli.Remote, command?: Cli.Command) => void;
    };
}
