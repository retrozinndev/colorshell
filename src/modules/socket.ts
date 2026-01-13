import { createRoot, getScope, Scope } from "ags";
import { register, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject?version=2.0";
import { createScopedConnection } from "gnim-utils";


/** colorshell's simplified unix socket communication class.
  * it's cool to use this for Compositor implementations(socket communication).
  * 
  * @example Client connection (sender) ```ts
  *     const client = new Socket(Socket.Type.CLIENT, `${GLib.get_user_runtime_dir()}/colorshell.sock`);
  *     console.log(client.send("help")); // client.send() returns the socket's response, then we print it
  * ```
  * 
  * @example Socket server (provider/receiver) ```ts
  *     const server = new Socket(Socket.Type.SERVER, `${GLib.get_user_runtime_dir()/colorshell.sock}`);
  *     server.connect("received", (_, content) => {
  *         
  *     });
  * ``` */
@register({ GTypeName: "ClshSocket" })
export class Socket<T extends Socket.Type = Socket.Type.CLIENT> extends GObject.Object {

    declare $signals: Socket.SignalSignatures;

    protected server: Gio.SocketService|null = null;
    protected address: Gio.UnixSocketAddress|null = null;
    protected scope: Scope = createRoot(() => getScope());
    protected encoder: TextEncoder|null = null;
    protected decoder: TextDecoder|null = null;

    @signal(String)
    protected received(_: string) {}
    
    @signal(String)
    protected sent(_: string) {}

    @signal(Gio.IOErrorEnum)
    protected panic(_: Gio.IOErrorEnum) {}

    /** @param listen whether to listen to the socket as soon as the class is instantiated 
      * @param contentSeparator server response separator, by default it's a line-break */
    constructor(type: Socket.Type.CLIENT, path: string|Gio.File, listen?: boolean, outputSeparator?: string)

    /** @param type defines the behavior of the instance, to send/receive to data(CLIENT) or receive/send from/to client(SERVER)
      * @param path the socket address path, where it's phisically stored */
    constructor(type: T, path: string|Gio.File, listen: boolean = false, outputSeparator: string = '\n') {
        super();
        path = typeof path === "string" ?
            Gio.File.new_for_path(path)
        : path;

        if(type === Socket.Type.SERVER) {
            this.server = Gio.SocketService.new();
            if(path.query_exists(null)) {
                console.debug("Socket: Removing previous socket file");
                path.delete(null);
            }

            this.server.add_address(
                Gio.UnixSocketAddress.new(path.peek_path()!),
                Gio.SocketType.STREAM,
                Gio.SocketProtocol.TCP,
                null
            );

            this.scope.run(() => {
                createScopedConnection(
                    this.server!, "incoming", (conn) => {
                        const data = Gio.DataInputStream.new(conn.get_input_stream());
                        data.read_upto_async('\x00', -1, GLib.PRIORITY_DEFAULT, null, (_, res) => {
                            let str!: string;

                            try {
                                str = data.read_upto_finish(res)[0];
                            } catch(e) {
                                this.emit("panic", e as Gio.IOErrorEnum);
                                return;
                            }

                            this.emit("received", str);
                        });
                    }
                );
            });
            return;
        }

        if(!path.query_exists(null))
            throw new Error("Socket file couldn't be found, please check if the program has permissions or if the file actually exists");

        this.address = Gio.UnixSocketAddress.new(path.peek_path()!);
        if(!listen) return;

        const client = Gio.SocketClient.new();
        client.set_timeout(0);
        client.set_socket_type(Gio.SocketType.STREAM);
        client.set_family(Gio.SocketFamily.UNIX);
        client.connect_async(this.address, null, (_, res) => {
            let conn!: Gio.SocketConnection;

            try {
                conn = client.connect_finish(res);
            } catch(e) {
                console.error("Socket: Failed to create a connection to listen to socket");
                return;
            }

            const sock = conn.get_socket();
            sock.set_timeout(0);
            sock.set_blocking(false);
            sock.set_keepalive(true); // keep listening to the socket

            GLib.io_add_watch(
                GLib.IOChannel.unix_new(sock.get_fd()),
                GLib.PRIORITY_DEFAULT,
                GLib.IOCondition.IN | GLib.IOCondition.PRI | GLib.IOCondition.HUP,
                (_, cond: GLib.IOCondition) => {
                    if(cond === GLib.IOCondition.HUP) {
                        conn.close();
                        console.log(`Socket: Connection was hang up`);
                        return false;
                    }


                    if(conn.is_closed()) {
                        console.log("Socket: The listening input stream has been closed, ignoring current call");
                        return false;
                    }

                    if(conn.inputStream.is_closed()) {
                        console.log("Socket: The input stream got closed, the i/o watch will be removed");
                        return false;
                    }

                    if(conn.outputStream.is_closed()) {
                        console.log("Socket: The input stream got closed, the i/o watch will be removed");
                        return false;
                    }

                    conn.inputStream.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null, (_, res) => {
                        let str!: string;

                        try {
                            str = (this.decoder ?? (this.decoder = new TextDecoder))
                                .decode(conn.inputStream.read_bytes_finish(res).toArray());
                        } catch(e) {
                            console.error(`Socket: An error occurred while reading the input stream bytes: ${(e as Error).message}`);
                            console.debug(e);
                            return;
                        }

                        str.split(outputSeparator).filter(s => s.trim() !== "").forEach(msg =>
                            this.emit("received", msg)
                        );
                    });
                    return true;
                }
            );
        });
    }

    /** allows to create a connection paired with the instance scope.
      * when the instance is automatically disposed, the connections are also disposed.
      * @param signal the signal to connect to
      * @param callback the signal callback */
    scopeConnect<S extends keyof Socket.SignalSignatures>(
        signal: keyof Socket.SignalSignatures,
        callback: Socket.SignalSignatures[S]
    ): void {
        this.scope.run(() => createScopedConnection(
            this, signal, callback as never
        ));
    }

    /** client-only method.
      * sends a message to the socket using a GSocketConnection.
      * 
      * @param message contents to send to the socket
      * @param wait whether to wait for the socket to finish the connection
      *
      * @returns a `string` promise, that returns the socket's response to the message, can be null. */
    async simpleSend(message: string, wait: boolean = false): Promise<string|null> {
        return new Promise((resolve, reject) => {
            const client = Gio.SocketClient.new();
            client.set_family(Gio.SocketFamily.UNIX);
            client.set_socket_type(Gio.SocketType.STREAM);
            client.connect_async(this.address!, null, (_, res) => {
                let conn!: Gio.SocketConnection;
                try {
                    conn = client.connect_finish(res);
                } catch(e) {
                    reject(`Failed to estabilish socket connection: ${(e as Gio.IOErrorEnum).message}`);
                    return;
                }

                conn.outputStream.write_bytes_async(
                    (this.encoder ?? (this.encoder = new TextEncoder())).encode(message),
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (_, res) => {
                        try {
                            conn.outputStream.write_bytes_finish(res);
                            conn.outputStream.close(null); // close output stream for this process

                            if(conn.get_input_stream().is_closed()) { // return nothing if the input stream got closed instantly
                                resolve(null);
                                return;
                            }

                            let output: string = "";
                            const chaneru = GLib.IOChannel.unix_new(conn.get_socket().get_fd());
                            GLib.io_add_watch(
                                chaneru, 
                                GLib.PRIORITY_DEFAULT, 
                                GLib.IOCondition.IN | GLib.IOCondition.PRI | GLib.IOCondition.HUP,
                                (_, cond) => {
                                    if(cond === GLib.IOCondition.HUP) {
                                        resolve(output);
                                        conn.close();
                                        return false;
                                    }

                                    const data = Gio.DataInputStream.new(conn.inputStream);
                                    data.read_upto_async('\x00', -1, GLib.PRIORITY_DEFAULT, null, (_, res) => {
                                        let out!: string;
                                        try {
                                            out = data.read_upto_finish(res)[0];
                                            output = out;
                                        } catch(e) {
                                            resolve(output);
                                            return;
                                        }
                                            
                                    });

                                    if(wait) {
                                        resolve(output);
                                        conn.close();
                                        return false;
                                    }

                                    return true;
                                }
                            );
                        } catch(e) {
                            this.emit("panic", e as Gio.IOErrorEnum);
                        }
                    }
                );
            });
        });
    }

    /** client-only method.
      * sends a message to the socket using a GSocketConnection.
      * 
      * @param message contents to send to the socket
      *
      * @returns a GInputStream promise, that contains the socket's response to the message, can be null. */
    async send(message: string): Promise<Gio.InputStream|null> {
        return new Promise((resolve, reject) => {
            const client = Gio.SocketClient.new();
            client.set_family(Gio.SocketFamily.UNIX);
            client.set_socket_type(Gio.SocketType.STREAM);
            client.connect_async(this.address!, null, (_, res) => {
                let conn!: Gio.SocketConnection;
                try {
                    conn = client.connect_finish(res);
                } catch(e) {
                    reject(`Failed to estabilish socket connection: ${(e as Gio.IOErrorEnum).message}`);
                    return;
                }

                conn.outputStream.write_bytes_async(
                    (this.encoder ?? (this.encoder = new TextEncoder())).encode(message),
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (_, res) => {
                        try {
                            conn.outputStream.write_bytes_finish(res);
                            conn.outputStream.close(null); // close output stream for this process

                            if(conn.get_input_stream().is_closed()) { // return nothing if the input stream got closed instantly
                                resolve(null);
                                return;
                            }

                            resolve(conn.inputStream);
                        } catch(e) {
                            this.emit("panic", e as Gio.IOErrorEnum);
                        }
                    }
                );
            });
        });
    }

    connect<S extends keyof Socket.SignalSignatures>(
        signal: S,
        callback: (self: Socket<T>, ...params: Parameters<Socket.SignalSignatures[S]>) => ReturnType<Socket.SignalSignatures[S]>
    ): number {
        return super.connect(signal, callback);
    }

    emit<S extends keyof Socket.SignalSignatures>(
        signal: S, ...args: Parameters<Socket.SignalSignatures[S]>
    ): void {
        super.emit(signal, ...args);
    }

    vfunc_dispose(): void {
        this.scope.dispose();
        this.server?.stop();
    }
}

export namespace Socket {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        /** server: when a client sends a message; client: when the server sends a message */
        "received": (content: string) => boolean|void;
        /** client-only signal. emitted when a message is sent to the server */
        "sent": (content: string) => void;
        /** emitted when a stream error occurs, if it ever happen */
        "panic": (error: Gio.IOErrorEnum) => void;
    }

    export enum Type {
        SERVER = 0,
        CLIENT = 1
    }
}
