import { register, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import GObject from "gi://GObject?version=2.0";
import CliInterface from ".";
import { decoder, encoder } from "../../modules/utils";
import GLib from "gi://GLib?version=2.0";


/** a cli interface implementation for a socket server that receives remote calls */
@register({ GTypeName: "ClshSocketCli" })
export class SocketCli extends GObject.Object implements CliInterface {
    #address: Gio.UnixSocketAddress;
    #sockFile: Gio.File;
    #service: Gio.SocketService;

    @signal(Array<string>, Object)
    protected received(args: Array<string>, remote: CliInterface.Remote) {
        if(args.length > 0)
            return;

        remote.println("Error: No commands/arguments were provided");
        remote.exit(1);
    }

    @signal(Object)
    protected connected(_: CliInterface.Remote) {}


    constructor(sockAddress: Gio.UnixSocketAddress) {
        super();

        this.#service = Gio.SocketService.new();
        this.#address = sockAddress;
        this.#sockFile = Gio.File.new_for_path(this.#address.get_path());

        if(this.#sockFile.query_exists(null))
            this.#sockFile.delete_async(GLib.PRIORITY_DEFAULT, null, null);
    
        this.#service.add_address(
            sockAddress,
            Gio.SocketType.STREAM,
            Gio.SocketProtocol.DEFAULT,
            this
        );

        this.#service.connect("incoming", (_, conn) => {
            const remote = new SocketCli.Remote(conn);
            this.emit("connected", remote);

            const stream = conn.get_input_stream();
            stream.read_bytes_async(1024, GLib.PRIORITY_DEFAULT, null, (_, res) => {
                let cmd!: string;
                try {
                    cmd = decoder.decode(stream.read_bytes_finish(res).toArray());
                } catch(e) {
                    console.error(e);
                    return;
                }

                if(cmd !== null && cmd !== undefined) {
                    try {
                        const [, args] = GLib.shell_parse_argv(cmd);
                        this.emit("received", args ?? [], remote);
                    } catch(e) {
                        this.emit("received", [], remote);
                    }
                }
            });
        });
    }

    /** @param keepFile whether to keep the .sock file **/
    stop(keepFile: boolean = false): void {
        this.#service.stop();
        if(keepFile)
            return;

        if(this.#sockFile.query_exists(null))
            this.#sockFile.delete_async(GLib.PRIORITY_LOW, null, null);
    }

    connect<S extends keyof CliInterface.SignalSignatures>(
        signal: S,
        callback: (source: CliInterface, ...params: Parameters<CliInterface.SignalSignatures[S]>) => ReturnType<CliInterface.SignalSignatures[S]>
    ): number {
        return super.connect(signal, callback);
    }

    emit<S extends keyof CliInterface.SignalSignatures>(
        signal: S,
        ...args: Parameters<CliInterface.SignalSignatures[S]>
    ): void {
        super.emit(signal, ...args);
    }
}

export namespace SocketCli {
    export class Remote implements CliInterface.Remote {
        #exited: boolean = false;
        #conn: Gio.SocketConnection;
        #busy: boolean = false;

        protected get stream() { return this.#conn.outputStream; }
        get exited() { return this.#exited; }

        constructor(conn: Gio.SocketConnection) {
            this.#conn = conn;
        }

        // TODO: support custom json output format
        print(msg: string, err?: boolean): void {
            if(!this.stream || this.stream.is_closed()) {
                console.error("SocketRemote: Couldn't print message: the OutputStream is closed");
                return;
            }

            if(this.#busy)
                while(this.#busy) {}

            this.stream.write_bytes_async(
                encoder.encode(msg), GLib.PRIORITY_LOW, null, null
            );
        }

        println(msg: string, err?: boolean): void {
            this.print(`${msg}\n`, err);
        }

        // TODO: support json output format
        exit(code: number): void {
            this.stream.close_async(GLib.PRIORITY_DEFAULT, null, () => {
                this.#conn.close_async(GLib.PRIORITY_DEFAULT, null, null);
            });
            this.#exited = true;
        }
    }
}
