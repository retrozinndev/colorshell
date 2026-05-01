import { register, signal } from "ags/gobject";
import GObject from "gi://GObject?version=2.0";
import CliInterface from ".";
import Gio from "gi://Gio?version=2.0";


@register({ GTypeName: "ClshGAppCli" })
class GAppCli extends GObject.Object implements CliInterface {
    declare $signals: CliInterface.SignalSignatures;
    #gapp: Gio.Application;
    #connection: number|null = null;

    @signal(Array<string>, Object)
    protected received(args: Array<string>, remote: CliInterface.Remote) {
        if(args.length > 0)
            return;

        // handle activating app if no arguments are provided
        if(this.#gapp.isRemote) {
            remote.println("Error: No commands/arguments were provided");
            remote.exit(1);
            return;
        }

        this.#gapp.activate();
    }

    @signal(Object)
    protected connected(_: CliInterface.Remote) {}


    constructor(app: Gio.Application) {
        super();
        this.#gapp = app;
        
        if(!(app.get_flags() & Gio.ApplicationFlags.HANDLES_COMMAND_LINE))
            console.warn("CliInterface: GApp: The provided GApplication does not handle command line. \
Please add the HANDLES_COMMAND_LINE flag to the GApplication");
        

        this.#connection = this.#gapp.connect("command-line", (_, cmd: Gio.ApplicationCommandLine) => {
            const remote = new GAppCli.Remote(cmd);
            this.emit("connected", remote);
            this.emit("received", cmd.get_arguments().toSpliced(0, 1), remote);
        });
        
    }

    stop(): void {
        if(this.#connection !== null)
            this.#gapp.disconnect(this.#connection);

        this.#connection &&= null;
    }
}

namespace GAppCli {
    export class Remote implements CliInterface.Remote {
        #exited: boolean = false;
        #cmd: Gio.ApplicationCommandLine;

        get exited() { return this.#exited; }

        constructor(cmd: Gio.ApplicationCommandLine) {
            this.#cmd = cmd;
        }

        print(msg: string, err: boolean = false): void {
            if(err) {
                this.#cmd.printerr_literal(msg);
                return;
            }

            this.#cmd.print_literal(msg);
        }

        println(msg: string, err: boolean = false): void {
            this.print(`${msg}\n`, err);
        }

        exit(code: number): void {
            this.#cmd.set_exit_status(code);
            this.#cmd.done();
            this.#exited = true;
        }
    }
}

export default GAppCli;
