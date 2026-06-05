import CliInterface from "./interface";


/** totally not-overthinked cli implementation for colorshell */
abstract class Cli {
    private static initialized: boolean = false;
    private static modules: Array<Cli.Module> = [];
    private static ifaces: Array<[Cli.Interface, number]> = [];


    /** initializes the cli.
      * @param ifaces list of `Cli.Interface` to add support cli calls 
      * @param modules list of `Cli.Module` to be added to the cli */
    public static init(ifaces?: Array<Cli.Interface>, modules?: Array<Cli.Module>): void {
        if(this.initialized)
            return;

        this.initialized = true;

        modules?.forEach(mod => this.addModule(mod));
        ifaces?.forEach(iface => this.addIface(iface));
    }

    /** stop listening on all of the interfaces and drop modules */
    public static deinit(): void {
        this.modules.splice(0, this.modules.length);
        this.ifaces.forEach(([iface, id]) => {
            iface.disconnect(id);
            iface.stop();
        });
        this.ifaces.splice(0, this.ifaces.length);

        this.initialized = false;
    }

    /** add an interface implementation for cli communication */
    public static addIface(iface: Cli.Interface): void {
        if(this.ifaces.find(([i]) => i === iface))
            return;

        const id = iface.connect("received", (_, args, remote) => {
            this.handle(args, remote);
        });
        this.ifaces.push([iface, id]);
    }

    public static addModule(mod: Cli.Module): void {
        if(this.modules.includes(mod))
            return;

        this.modules.push(mod);
    }

    /** translate string arguments to `Cli.Modules`, `Cli.Commands` and `Cli.Arguments`
    * order: module ?modArgs command ?cmdArgs 
    * @example colorshell media(module) --player=spotify(arg) pause(command) */
    public static handle(args: Array<string>, remote: Cli.Remote): void {
        const commandArgs: Array<Cli.Argument> = [];
        const moduleArgs: Array<Cli.Argument> = [];
        const mod: Cli.Module = this.modules.find(m => m.prefix === args[0]) ?? this.modules[0];
        let cmd: Cli.Command|undefined;

        // when no args are provided, leave handling to CliInterface
        if(args.length < 1)
            return;

        if(mod.prefix === args[0]) // remove module string from list
            args.splice(0, 1);

        let skip: boolean = false;
        for(let i = 0; i < args.length; i++) {
            const part = args[i];
            if(skip) {
                skip = false;
                continue;
            }

            if(this.isArgument(part)) {
                if(/^(-h|-[?]|--help)$/.test(part)) {
                    const help = cmd === undefined ?
                        (mod.help ?? this.genHelp(mod))
                    : this.genHelp(cmd);

                    remote.println(help);
                    remote.exit(0);
                    return; // ignore handling if it's asking for help
                }

                const [arg, skipNext] = this.handleArgument(cmd ?? mod, args, i, remote);
                skip = skipNext;

                if(!arg)
                    continue;

                cmd ?
                    commandArgs.push(arg)
                : moduleArgs.push(arg);

                continue;
            }

            if(cmd)
                continue;

            cmd = mod.commands?.find(c => c.name === part);
            if(!cmd) {
                remote.println(`Error: No such command "${part}"${
                    mod.prefix !== undefined ? ` for module "${mod.prefix}"` : ""
                }`, true);
                remote.exit(1);
                return;
            }
        }
        mod.onCalled?.(remote, cmd ?? undefined, moduleArgs);
        cmd?.onCalled?.(remote, commandArgs);
    }

    
    /** handles argument parsing and value handling altogether
      * @param cmd the module/command that is being handled
      * @param args argument list for `cmd`
      * @param index the current handling index in the list of arguments(current argument)
      * @param remote the remote connection with the `Cli`
      *
      * @returns a copy of the handled argument with "value" field set, if value is provided and 
      * `true` if handled argument used the next parameter as a value */
    private static handleArgument(cmd: Cli.Module|Cli.Command, args: Array<string>, index: number, remote: Cli.Remote): [Cli.Argument|null, boolean] {
        const cmdName = this.getCommandName(cmd);
        const flag = args[index];

        const argName = flag.includes('=') ?
            this.extractArgumentNameClassic(flag)
        : this.extractArgumentName(flag);

        const arg = this.isArgumentAlias(flag) ?
            this.findShortArgument(cmd, argName)
        : this.findFullArgument(cmd, argName);

        // handle argument not found
        if(!cmd.arguments || cmd.arguments.length < 1 || !arg) {
            remote.println(`Error: No such argument "${argName}"${
                cmdName !== null ? ` for command "${cmdName}"` : ""
            }`, true);
            remote.exit(1);

            return [null, false];
        }

        if(arg.hasValue) {
            const [value, skip] = this.handleArgumentValue(arg, args, index);
            if(value !== null) {
                const argCopy = this.copyObject(arg);
                argCopy.value = value;

                this.callArgument(arg, value, remote);
                return [argCopy, skip];
            }

            this.callArgument(arg, undefined, remote);
            return [arg, skip];
        }

        this.callArgument(arg, undefined, remote);
        return [arg, false];
    }

    /** handles interpreting the argument value
      * @returns the argument value, if specified by the remote and whether the next item in `args` should be skipped */
    private static handleArgumentValue(arg: Cli.Argument, args: Array<string>, index: number): [string|null, boolean] {
        if(!arg.hasValue)
            return [null, false];

        const flag = args[index];
        const name = flag.includes('=') ?
            this.extractArgumentNameClassic(flag)
        : this.extractArgumentName(flag);

        // check classic syntax: "--arg=value"
        if(new RegExp(`^(-|--)${name}=.*$`).test(flag)) {
            const val = flag.split('=', 2)[1];
            return [(val === undefined ? null : val), false];
        }

        // check modern syntax: ["--arg", "value"]
        const value = args[index+1];
        if(value === undefined || this.isArgument(value)) // doesn't allow next argument to be the value for previous
            return [null, false];

        return [value, true];
    }

    /** extracts argument name from classic flag expressions(e.g.: `"--mode=update"` -> `"mode"`) */
    private static extractArgumentNameClassic(flag: string): string {
        return flag.split(/=| /, 1)[0].replace(/^--|-/, "");
    }

    /** extracts argument name from modern flag expressions(e.g.: `"--mode"` -> `"mode"`) */
    private static extractArgumentName(flag: string): string {
        return flag.split(' ', 1)[0].replace(/^--|-/, "");
    }

    /** generates a help message, joining the `help` property of all 
      * of the arguments and commands of `cmd` in a structured way */
    public static genHelp(cmd: Cli.Command|Cli.Module): string {
        /** add formatted `help` string to `prefix` */
        function addHelp(prefix: string, help?: string): string {
            return `${prefix}${help !== undefined ? `: ${
                help.split('\n').map((str, i) => {
                    if(i === 0)
                        return str;

                    return `${' '.repeat(prefix.length+2)}${str}`;
                }).join('\n')
            }` : ""}`;
        }

        return `${cmd.help !== undefined ? `${cmd.help}\n` : ""
        }${
            this.isModule(cmd) && cmd.commands && cmd.commands.length > 0 ?
                `\nCommands:\n${cmd.commands.map(cmd =>
                    `${addHelp(`  ${cmd.name}`, cmd.help)}\n`
                ).join('')}`
            : ""
        }${
            cmd.arguments && cmd.arguments.length > 0 ?
                `\nArguments:\n${cmd.arguments.map(arg =>
                    `${addHelp(`  ${arg.alias !== undefined ? `-${arg.alias}, ` : ""}--${arg.name}`, arg.help)}\n`
                ).join('')}`
            : ""
        }`
    }

    /** safely call a `Cli.Argument`'s "onCalled" method and print errors to remote if they occur */
    private static callArgument(arg: Cli.Argument, value: string|undefined, remote: Cli.Remote): void {
        if(typeof arg.onCalled !== "function")
            return;

        try {
            arg.onCalled(remote, value);
        } catch(e) {
            if(remote.exited)
                return;

            remote.println(`Error: An exception occurred while calling argument "${arg.name
                }": ${(e as Error).message}\n${(e as Error).stack}`);
            remote.exit(1);
        }
    }
    private static isArgument(str: string): boolean {
        return /^-(-)?/.test(str);
    }

    /** searches for a `Cli.Argument` object for `command` by its `alias` */
    private static findShortArgument(command: Cli.Module|Cli.Command, alias: string): Cli.Argument|null {
        return command.arguments?.find(arg => arg.alias === alias) ?? null;
    }

    /** searches for a `Cli.Argument` object for `command` by its `name` */
    private static findFullArgument(command: Cli.Module|Cli.Command, name: string): Cli.Argument|null {
        return command.arguments?.find(arg => arg.name === name) ?? null;
    }

    /** @returns `true` if provided argument is a full argument (e.g.: --help) */
    public static isFullArgument(arg: string): boolean {
        return arg.startsWith("--");
    }

    /** @returns `true` if provided argument is an alias (e.g.: "-h" for "--help") */
    public static isArgumentAlias(arg: string): boolean {
        return !arg.startsWith("--") && arg.startsWith('-');
    }

    public static isModule(obj: object): obj is Cli.Module {
        return "prefix" in obj || 
            ("commands" in obj && Array.isArray(obj["commands"]));
    }

    /** get the name/prefix of a command/module.
      * @returns the name of the command, or null if not specified(in the case of the main module) */
    private static getCommandName(cmd: Cli.Module|Cli.Command): string|null {
        if(this.isModule(cmd))
            return cmd.prefix ?? null;

        return cmd.name;
    }

    public static isCommand(obj: object): obj is Cli.Command {
        return "name" in obj && 
            ("onCalled" in obj && typeof obj["onCalled"] === "function");
    }

    private static copyObject<T extends object>(obj: T): T {
        const newObject = {} as T;
        for(const key of Object.keys(obj) as Array<keyof T>) {
            if(Array.isArray(obj[key])) {
                newObject[key] = [...obj[key] as Array<unknown>] as T[keyof T];
                continue;
            }

            if(typeof obj[key] === "object") {
                newObject[key] = this.copyObject(obj[key] as object) as T[keyof T];
                continue;
            }

            newObject[key] = obj[key];
        }

        return newObject;
    }
}

namespace Cli {
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
          * (accessed in `Cli.Command`|`Cli.Module`'s `onCalled` method) */
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
        onCalled?: (remote: Cli.Remote, args: Array<Cli.Argument>) => void;
    };

    export type Module = {
        /** command to come after the cli call.
            * @example `colorshell ${prefix?} ${command}`*/
        prefix?: string;
        commands?: Array<Cli.Command>;
        arguments?: Array<Cli.Argument>;
        help?: string;
        /** called everytime the prefix is used, even when using module commands */
        onCalled?: (remote: Cli.Remote, command?: Cli.Command, moduleArgs?: Array<Cli.Argument>) => void;
    };
}

export default Cli;
