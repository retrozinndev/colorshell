import { createRoot, getScope, Scope } from "ags";
import { register, signal } from "ags/gobject";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject?version=2.0";
import { encoder, createScopedConnection, watchInputStream, decoder } from "./utils";

Gio._promisify(Gio.SocketClient.prototype, "connect_async", "connect_finish");
Gio._promisify(Gio.DataInputStream.prototype, "read_upto_async", "read_upto_finish");
Gio._promisify(Gio.OutputStream.prototype, "write_bytes_async", "write_bytes_finish");

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
class Socket<T extends Socket.Type = Socket.Type.CLIENT> extends GObject.Object {
    declare $signals: Socket.SignalSignatures;

    protected server: Gio.SocketService|null = null;
    protected address: Gio.UnixSocketAddress|null = null;
    protected scope: Scope = createRoot(() => getScope());

    @signal(String)
    protected received(_: string) {}
    
    @signal(String)
    protected sent(_: string) {}

    /** @param listen whether to listen to the socket as soon as the class is instantiated 
      * @param outputSeparator server response separator, by default it's a line-break */
    constructor(type: Socket.Type.CLIENT, path: string|Gio.File, listen?: boolean, outputSeparator?: string)
    constructor(type: Socket.Type.SERVER, path: string|Gio.File);

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
                        data.read_upto_async('\x00', -1, GLib.PRIORITY_DEFAULT, null).then(([str]) =>
                            this.emit("received", str)
                        ).catch(console.error);
                    }
                );
            });

            return;
        }

        if(!path.query_exists(null))
            throw new Error("Socket file couldn't be found, please check if the program has permissions or if the file actually exists");

        this.address = Gio.UnixSocketAddress.new(path.peek_path()!);

        if(!listen) 
            return;

        const client = Gio.SocketClient.new();

        client.set_timeout(0);
        client.set_socket_type(Gio.SocketType.STREAM);
        client.set_family(Gio.SocketFamily.UNIX);
        client.connect_async(this.address, null).then(conn => {
            this.watchOutput(conn, (data) => {
                // separate messages by line-break
                data.split(outputSeparator).filter(s => s.trim() !== "").forEach(msg =>
                    this.emit("received", msg)
                );
            });
        }).catch((e) => console.error("Failed to estabilish a listening connection to socket:", e));
    }

    /** watch a socket connection for output
      * when `timeout` is reached, the `GIOChannel` will be closed and `GCancellable::cancelled` emitted.
      * if `callback` returns `true`, the watch will be removed
      *
      * @param conn the `GSocketConnection` to watch for output 
      * @param callback called when the connection receives data
      * @param timeout maximum time to wait for a response in milliseconds. set to -1 to run indefinitely.
      *
      * @returns a `GCancellable`, which can be used to cancel the `GIOWatch` */
    protected watchOutput(
        conn: Gio.SocketConnection,
        callback: (data: string) => boolean|void,
        timeout: number = -1,
        onTimeout?: () => void
    ): Gio.Cancellable {
        const cancellable = Gio.Cancellable.new();

        if(conn.inputStream.is_closed())
            throw new Error("GInputStream is closed. Can't read from a closed stream");

        watchInputStream(conn.inputStream, callback, cancellable)
            .catch(console.error);

        if(timeout >= 0)
            setTimeout(() => {
                cancellable.cancel();
                onTimeout?.();
            }, timeout);

        return cancellable;
    }

    /** client-only method.
      * sends a message to the socket and waits for a response.
      * 
      * @param message contents to send to the socket
      *
      * @returns a `string` promise, that returns the socket's response to the message, can be null. */
    async simpleSend(message: string): Promise<string|null> {
        const conn = await this.send(message);
        const stream = conn.inputStream;
        if(!stream || stream.is_closed())
            return null;

        return decoder.decode(
            (await stream.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null)).toArray()
        );
    }

    /** client-only method.
      * synchronous version of `Socket.simpleSend()`.
      * sends a message to the socket and waits for a response.
      * 
      * @param message contents to send to the socket
      *
      * @returns a `string` promise, that returns the socket's response to the message, can be null. */
    simpleSendSync(message: string): string|null {
        const conn = this.sendSync(message);
        const stream = conn.inputStream;
        if(!stream || stream.is_closed())
            return null;

        return decoder.decode(stream.read_bytes(4096, null).toArray());
    }

    /** client-only method.
      * sends a message to the socket using a GSocketConnection.
      * WARNING: the caller is responsible for closing the connection and 
      * reading/writing data.
      * 
      * @param message contents to send to the socket
      *
      * @returns the GSocketConnection used to send the message */
    async send(message: string): Promise<Gio.SocketConnection> {
        const client = Gio.SocketClient.new();
        client.set_family(Gio.SocketFamily.UNIX);
        client.set_socket_type(Gio.SocketType.STREAM);
        client.set_protocol(Gio.SocketProtocol.DEFAULT);

        const conn = await client.connect_async(this.address!, null);
        await conn.outputStream.write_bytes_async(
            encoder.encode(message),
            GLib.PRIORITY_DEFAULT,
            null
        );

        return conn;
    }

    /** client-only method.
      * synchronous version of `Socket.send()`.
      * sends a message to the socket using a GSocketConnection.
      * WARNING: the caller is responsible for closing the connection and 
      * reading/writing data.
      * 
      * @param message contents to send to the socket
      *
      * @returns the GSocketConnection used to send the message */
    sendSync(message: string): Gio.SocketConnection {
        const client = Gio.SocketClient.new();
        client.set_family(Gio.SocketFamily.UNIX);
        client.set_socket_type(Gio.SocketType.STREAM);
        client.set_protocol(Gio.SocketProtocol.DEFAULT);

        const conn = client.connect(this.address!, null);
        conn.outputStream.write_bytes(
            encoder.encode(message),
            null
        );

        return conn;
    }
}

namespace Socket {
    export interface SignalSignatures extends GObject.Object.SignalSignatures {
        /** server: when a client sends a message; client: when the server sends a message */
        "received": (content: string) => boolean|void;
        /** client-only signal. emitted when a message is sent to the server */
        "sent": (content: string) => void;
    }

    export enum Type {
        SERVER = 0,
        CLIENT = 1
    }
}

export default Socket;
