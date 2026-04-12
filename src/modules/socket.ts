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
    protected readonly encoder = new TextEncoder();
    protected readonly decoder = new TextDecoder("utf-8");

    @signal(String)
    protected received(_: string) {}
    
    @signal(String)
    protected sent(_: string) {}

    @signal(Object)
    protected panic(_: Error) {}

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
                                this.emit("panic", e as Error);
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

            this.watchOutput(conn, (data) => {
                // separate messages by line-break
                data.split(outputSeparator).filter(s => s.trim() !== "").forEach(msg =>
                    this.emit("received", msg)
                );
            });
        });
    }

    /** watch a socket for new messages using `GIOWatch`.
      * @param socket the socket or connection to watch
      * @param callback called when the watch triggers one of the `conditions` 
      * @param conditions `GIOConditions` to watch the socket IO for. default: `IN`|`PRI`|`HUP`
      * (when `HUP`, the watch is internally removed, so you just need to disconnect from the socket) 
      *
      * @returns a `GCancellable`, which can be used to stop the `GIOWatch` of the method */
    protected watchSocket(
        socket: Gio.Socket|Gio.SocketConnection,
        callback?: (condition: GLib.IOCondition) => void,
        conditions: GLib.IOCondition = GLib.IOCondition.IN|GLib.IOCondition.PRI|GLib.IOCondition.HUP
    ): Gio.Cancellable {
        socket = socket instanceof Gio.SocketConnection ?
            socket.get_socket()
        : socket;

        const cancellable = Gio.Cancellable.new();
        const chaneru = GLib.IOChannel.unix_new(socket.get_fd());
        const source = GLib.io_create_watch(chaneru, conditions);

        source.set_priority(GLib.PRIORITY_LOW);
        source.set_callback(((_: GLib.IOChannel, condition: GLib.IOCondition) => {
            if(condition === GLib.IOCondition.HUP) {
                cancellable.cancel();
                callback?.(condition);
                return false;
            }

            if(callback)
                return callback(condition);

            return true;
        }) as never);
        source.attach(null);
        
        const id = GObject.Object.prototype.connect.call(cancellable, "cancelled", () => {
            cancellable.disconnect(id);
            source.destroy();
        });

        return cancellable;
    }

    /** watch a socket connection for output
      * when `timeout` is reached, the `GIOWatch` will be destroyed and `GCancellable::cancelled` eimtted.
      *
      * @param conn the `GSocketConnection` to watch for output 
      * @param callback called when the connection receives data
      * @param timeout maximum time to wait for a response in milliseconds. set to -1 to run indefinitely.
      *
      * @returns a `GCancellable`, which can be used to cancel the `GIOWatch` */
    protected watchOutput(
        conn: Gio.SocketConnection,
        callback?: (data: string) => void,
        timeout: number = -1,
        onTimeout?: () => void
    ): Gio.Cancellable {
        let pending: boolean = false;
        const cancellable = this.watchSocket(conn, (cond) => {
            if(cond === GLib.IOCondition.HUP) {
                conn.close(null);
                console.log("Socket: IO and Socket Connection were closed");
                cancellable.cancel();
                return false;
            }

            if(conn.is_closed()) {
                console.warn("Socket: The Socket connection is closed");
                cancellable.cancel();
                return false;
            }

            if(conn.inputStream.is_closed() || conn.outputStream.is_closed()) {
                console.warn("Socket: One of the streams got closed, the IO watch will be removed");
                cancellable.cancel();
                return false;
            }

            if(pending) {
                console.debug("Socket: Stream: There already is a read on its way, this call was ignored");
                cancellable.cancel();
                return true;
            }

            pending = true;
            conn.inputStream.read_bytes_async(2048, GLib.PRIORITY_DEFAULT, null, (_, res) => {
                let str!: string;
                pending = false;

                try {
                    str = this.decoder.decode(conn.inputStream.read_bytes_finish(res).toArray());
                } catch(e) {
                    console.error("Socket: An error occurred while reading the input stream bytes:", e);
                    return;
                }

                callback?.(str);
            });
            return true;
        });

        if(timeout >= 0)
            setTimeout(() => {
                cancellable.cancel();
                onTimeout?.();
            }, timeout);

        return cancellable;
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
      * @param wait whether to wait for the socket to send a response
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
                    this.encoder.encode(message),
                    GLib.PRIORITY_LOW,
                    null,
                    (_, res) => {
                        try {
                            conn.outputStream.write_bytes_finish(res);
                            conn.outputStream.close(null); // close output stream for this process

                            if(conn.get_input_stream().is_closed()) { // return nothing if the input stream got closed instantly
                                resolve(null);
                                return;
                            }

                            if(!wait) {
                                resolve(null);
                                return;
                            }

                            this.watchOutput(conn, (data) => {
                                resolve(data);
                                conn.close();
                            }, 10000, () => {
                                const err = new Error("Socket: 10 Seconds timeout reached");
                                reject(err);
                                this.emit("panic", err);
                            });
                        } catch(e) {
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
                    this.encoder.encode(message),
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
                            this.emit("panic", e as Error);
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
}

export namespace Socket {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        /** server: when a client sends a message; client: when the server sends a message */
        "received": (content: string) => boolean|void;
        /** client-only signal. emitted when a message is sent to the server */
        "sent": (content: string) => void;
        /** emitted when a stream error occurs, if it ever happen */
        "panic": (error: Error) => void;
    }

    export enum Type {
        SERVER = 0,
        CLIENT = 1
    }
}
