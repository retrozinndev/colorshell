import "ags/overrides"; // thanks Aylur!!
import "./config";
import { handleArguments } from "./modules/arg-handler";
import { Windows } from "./windows";
import { Notifications } from "./modules/notifications";
import { Wallpaper } from "./modules/wallpaper";
import { Stylesheet } from "./modules/stylesheet";
import { Clipboard } from "./modules/clipboard";
import { Gdk, Gtk } from "ags/gtk4";
import { createBinding, createComputed, createRoot, getScope, onCleanup, Scope } from "ags";
import { OSDModes, triggerOSD } from "./window/osd";
import { programArgs, programInvocationName } from "system";
import { setConsoleLogDomain } from "console";
import { createScopedConnection, createSubscription, encoder, secureBaseBinding } from "./modules/utils";
import { exec } from "ags/process";
import { NightLight } from "./modules/nightlight";
import { Backlights } from "./modules/backlight";
import { initCompositor } from "./compositors";
import { Input } from "./modules/input";
import { Idle } from "./modules/idle";
import GObject, { register } from "ags/gobject";
import Media from "./modules/media";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";
import AstalWp from "gi://AstalWp";


Gio._promisify(Gio.DBus, "get", "get_finish");
Gio._promisify(Gio.DBusProxy, "new", "new_finish");
Gio._promisify(Gio.DBusConnection.prototype, "call", "call_finish");

@register({ GTypeName: "Shell" })
export class Shell extends Adw.Application {
    private static instance: Shell;

    public static runtimeDir: Gio.File = Gio.File.new_for_path(`${
        GLib.get_user_runtime_dir() ?? `/run/user/${exec("id -u").trim()}`}/colorshell`);
    public static dataDir: Gio.File = Gio.File.new_for_path(`${
        GLib.get_user_data_dir() ?? `${GLib.get_home_dir()}/.local/share`}/colorshell`);
    public static cacheDir: Gio.File = Gio.File.new_for_path(`${
        GLib.get_user_cache_dir() ?? `${GLib.get_home_dir()}/.cache`}/colorshell`);
    /** where runtime-generated config files are stored */
    public static runtimeConfigDir: Gio.File = Gio.File.new_for_path(`${this.runtimeDir.peek_path()}/config`);

    #scope!: Scope;
    #connections = new Map<GObject.Object, Array<number> | number>();
    #providers: Array<Gtk.CssProvider> = [];
    #socketService!: Gio.SocketService;
    #socketFile!: Gio.File;
    #pid: number|null = null;

    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: COLORSHELL_VERSION ?? "0.0.0-unknown",
        });

        setConsoleLogDomain("Colorshell");
        GLib.set_application_name("colorshell");
    }

    public static getDefault(): Shell {
        if(!this.instance)
            this.instance = new Shell();

        return this.instance;
    }

    public resetStyle(): void {
        this.#providers.forEach(provider =>
            Gtk.StyleContext.remove_provider_for_display(
                Gdk.Display.get_default()!,
                provider
            )
        );
    }

    public removeProvider(provider: Gtk.CssProvider): void {
        if(!this.#providers.includes(provider)) {
            console.warn("Colorshell: Couldn't find the provided GtkCssProvider to remove. Was it added before?");
            return;
        }

        for(let i = 0; i < this.#providers.length; i++) {
            const prov = this.#providers[i];
            if(prov === provider) {
                this.#providers.splice(i, 1);
                Gtk.StyleContext.remove_provider_for_display(
                    Gdk.Display.get_default()!,
                    provider
                );
                break;
            }
        }
    }

    public applyStyle(stylesheet: string): void {
        try {
            const provider = Gtk.CssProvider.new();
            provider.load_from_string(stylesheet)
            this.#providers.push(provider);
            
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default()!,
                provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            );
        } catch(e) {
            console.error(`Colorshell: Couldn't apply style. Stderr: ${e}`);
            return;
        }
    }

    vfunc_command_line(cmd: Gio.ApplicationCommandLine): number {
        const args = cmd.get_arguments().toSpliced(0, 1); // remove executable

        if(cmd.isRemote) {
            try {
                const res = handleArguments(cmd, args);

                cmd.done();
                cmd.set_exit_status(res);
                return res;
            } catch(_e) {
                const e = _e as Error;
                cmd.printerr_literal(`Error: something went wrong! Stderr: ${e.message}\n${e.stack}`);
                cmd.done();
                return 1;
            }
        } else {
            if(args.length > 0) {
                cmd.printerr_literal("Error: colorshell not running. Try to clean-run before using arguments");
                cmd.done();
                return 1;
            }
            
            this.activate();
        }
        
        return 0;
    }

    vfunc_activate(): void {
        this.hold();

        createRoot((dispose) => {
            this.#connections.set(this, this.connect("shutdown", () => dispose()));
            onCleanup(() => {
                this.#connections.forEach((ids, obj) => Array.isArray(ids) ?
                    ids.forEach(id => obj.disconnect(id))
                : obj.disconnect(ids));
            });

            this.#scope = getScope();
            this.main();
        });
    }

    private async getAppPID(): Promise<number> {
        if(this.#pid != null)
            return this.#pid;

        const session = await (Gio.DBus.get(Gio.BusType.SESSION, null) as unknown as Promise<Gio.DBusConnection>);
        const proxy = await (Gio.DBusProxy.new(
            session,
            Gio.DBusProxyFlags.NONE,
            null,
            "io.github.retrozinndev.colorshell",
            "/io/github/retrozinndev/colorshell",
            "org.freedesktop.Application",
            null
        ) as unknown as Promise<Gio.DBusProxy>);

        const owner = proxy.get_name_owner();

        if(!owner)
            throw new Error("DBus: Couldn't get name owner to retrieve PID");

        // @ts-ignore
        const params = GLib.Variant.new_tuple([GLib.Variant.new_string(owner)]);

        const pidVariant: GLib.Variant<"(u)"> = await session.call(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus",
            "GetConnectionUnixProcessID",
            params,
            GLib.VariantType.new("(u)"),
            Gio.DBusCallFlags.NONE,
            300,
            null
        );

        if(!pidVariant)
            throw new Error("DBus: call to org.freedesktop.DBus.GetConnectionUnixProcessID returned a nullish value");

        this.#pid = pidVariant.get_child_value(0).get_uint32();

        return this.#pid;
    }

    private init(): void {
        console.log("Colorshell: Initializing things");

        // create shell directories
        [
            Shell.runtimeDir,
            Shell.cacheDir,
            Shell.dataDir,
            Shell.runtimeConfigDir
        ].forEach(dir => {
            if(dir.query_exists(null))
                return;

            dir.make_directory_with_parents(null);
        });

        const pidFile = Gio.File.new_for_path(`${Shell.runtimeDir.peek_path()!}/.pid`);
        this.getAppPID().then((pid) => {
            try {
                pidFile.replace_contents(encoder.encode(
                    pid.toString()
                ), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            } catch(e) {
                console.error(e);
            }
        }).catch(e => console.error(e));

        // load gresource from build-defined path
        try {
            const gresourcesPath: string = !/^\//.test(GRESOURCES_FILE) ?
                (GRESOURCES_FILE.split('/').filter(s => s !== "").map(path => {
                    // support environment variables at runtime
                    if(/^\$/.test(path)) {
                        const env = GLib.getenv(path.replace(/^\$/, ""));
                        if(env === null)
                            throw new Error(`Couldn't get environment variable: ${path}`);

                        return env;
                    }
                    return path;
                }).join('/'))
            : GRESOURCES_FILE;

            const gresource = Gio.Resource.load(gresourcesPath);
            Gio.resources_register(gresource);
        } catch(_e) {
            const e = _e as Error;
            console.error(`Error: couldn't load gresource! Stderr: ${e.message}\n${e.stack}`);
        }

        // add icons 
        Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
            .add_resource_path("/io/github/retrozinndev/colorshell/icons")

        Gio.resources_enumerate_children(
            "/io/github/retrozinndev/colorshell/config",
            Gio.ResourceLookupFlags.NONE
        ).forEach(name => {
            if(!/\..*$/.test(name))
                return;

            const data = Gio.resources_lookup_data(`/io/github/retrozinndev/colorshell/config/${name}`, null),
                file = Gio.File.new_for_path(`${Shell.runtimeDir.peek_path()!}/config/${name}`);

            file.replace_contents_bytes_async(data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null, null);
        });

        this.#socketFile = Gio.File.new_for_path(`${Shell.runtimeDir.peek_path()!}/.sock`);

        if(this.#socketFile.query_exists(null)) {
            console.log(`Colorshell: Deleting previous instance's socket`);
            this.#socketFile.delete(null);
        }
        
        this.#socketService = Gio.SocketService.new();
        this.#socketService.add_address(
            Gio.UnixSocketAddress.new(this.#socketFile.get_path()!),
            Gio.SocketType.STREAM,
            Gio.SocketProtocol.DEFAULT,
            null
        );

        // handle communication via socket
        createScopedConnection(this.#socketService, "incoming", (conn) => {
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
                     handleArguments({
                         print_literal: (msg) => conn.outputStream.write_bytes(
                                encoder.encode(`${msg}\n`),
                                null
                            ),
                            // TODO: support writing to stderr(i don't know how to do that :sob:)
                            printerr_literal: (msg) => conn.outputStream.write_bytes(
                                encoder.encode(`${msg}\n`),
                                null
                            )
                        }, parsedArgs!);

                        conn.outputStream.flush(null);
                        conn.close(null);
                        return;
                    }

                    conn.outputStream.write_bytes(
                        encoder.encode("Error: Unexpected error occurred on argument parsing!"),
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

            return false;
        });
    }

    private main(): void {
        this.init();

        console.log("Colorshell: Initializing modules");
        Wallpaper.getDefault();
        Stylesheet.getDefault();

        initCompositor();

        Clipboard.getDefault();
        Input.getDefault();
        NightLight.getDefault();
        Idle.getDefault();
        Media.getDefault();

        if(!Windows.getDefault().isOpen("bar"))
            Windows.getDefault().open("bar");

        createSubscription(
            createComputed([
                secureBaseBinding<AstalWp.Endpoint>(createBinding(
                    AstalWp.get_default(), "defaultSpeaker"
                ), "volume", null),
                secureBaseBinding<AstalWp.Endpoint>(createBinding(
                    AstalWp.get_default(), "defaultSpeaker"
                ), "mute", null)
            ]),
            () => !Windows.getDefault().isOpen("control-center") &&
                triggerOSD(OSDModes.sink)
        );

        createSubscription(
            secureBaseBinding<Backlights.Backlight>(
                createBinding(Backlights.getDefault(), "default"),
                "brightness",
                100
            ),
            () => !Windows.getDefault().isOpen("control-center") &&
                triggerOSD(OSDModes.brightness)
        );

        this.#connections.set(Notifications.getDefault(), [
            Notifications.getDefault().connect("notification-added", () => {
                Windows.getDefault().open("floating-notifications");
            })
        ]);
    }

    quit(): void {
        this.release();
        super.quit();
    }
}

Shell.getDefault().runAsync([ programInvocationName, ...programArgs ]);
