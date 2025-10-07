// thanks Aylur!!
import "../node_modules/ags/lib/overrides";
import "./config";
import { 
    PluginApps, 
    PluginClipboard, 
    PluginMedia, 
    PluginShell, 
    PluginWallpapers, 
    PluginWebSearch,
    PluginKill
} from "./runner/plugins";
import { handleArguments } from "./modules/arg-handler";
import { Runner } from "./runner/Runner";
import { Windows } from "./windows";
import { Notifications } from "./modules/notifications";
import { Wallpaper } from "./modules/wallpaper";
import { Stylesheet } from "./modules/stylesheet";
import { Clipboard } from "./modules/clipboard";
import { Gdk, Gtk } from "ags/gtk4";
import { createBinding, createRoot, getScope, Scope } from "ags";
import { OSDModes, triggerOSD } from "./window/osd";
import { programArgs, programInvocationName } from "system";
import { setConsoleLogDomain } from "console";
import { initPlayer } from "./modules/media";
import { createSubscription, encoder, secureBaseBinding } from "./modules/utils";
import { exec } from "ags/process";
import { NightLight } from "./modules/nightlight";
import { Backlights } from "./modules/backlight";
import GObject, { register } from "ags/gobject";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";
import AstalWp from "gi://AstalWp";


const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch,
    PluginKill,
    PluginMedia,
    PluginWallpapers,
    PluginClipboard
];

const defaultWindows: Array<string> = [ "bar" ];

GLib.unsetenv("LD_PRELOAD");


@register({ GTypeName: "Shell" })
export class Shell extends Adw.Application {
    private static instance: Shell;

    #scope!: Scope;
    #connections = new Map<GObject.Object, Array<number> | number>();
    #providers: Array<Gtk.CssProvider> = [];
    #gresource: Gio.Resource|null = null;
    #socketService!: Gio.SocketService;
    #socketFile!: Gio.File;

    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: COLORSHELL_VERSION ?? "0.0.0-unknown",
        });

        setConsoleLogDomain("colorshell");
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
                // warn user that this method is pretty slow
                cmd.print_literal("\nColorshell: !! Using a remote instance to communicate is pretty slow, \
you should use the socket in the XDG_RUNTIME_DIR/colorshell.sock for a faster response.\n\n");

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
        super.vfunc_activate();
        this.hold();
        this.main();
    }

    private init(): void {
        // load gresource from build-defined path
        try {
            this.#gresource = Gio.Resource.load(GRESOURCES_FILE.split('/').filter(s => 
                s !== ""
            ).map(path => {
                // support environment variables at runtime
                if(/^\$/.test(path)) {
                    const env = GLib.getenv(path.replace(/^\$/, ""));
                    if(env === null)
                        throw new Error(`Couldn't get environment variable: ${path}`);

                    return env;
                }

                return path;
            }).join('/'));
            Gio.resources_register(this.#gresource);

            // add icons 
            Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
                .add_resource_path("/io/github/retrozinndev/colorshell/icons")
        } catch(_e) {
            const e = _e as Error;
            console.error(`Error: couldn't load gresource! Stderr: ${e.message}\n${e.stack}`);
        }

        this.#socketFile = Gio.File.new_for_path(`${GLib.get_user_runtime_dir() ?? 
            `/run/user/${exec("id -u").trim()}`}/colorshell.sock`);

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
        this.#connections.set(this.#socketService, 
            this.#socketService.connect("incoming", (_, conn) => {
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
            })
        );
    }

    private main(): void {
        Gtk.init();
        Adw.init();
        this.init();

        createRoot((dispose) => {
            console.log(`Colorshell: Initializing things`);
            this.#connections.set(this, this.connect("shutdown", () => dispose()));
            this.#scope = getScope();

            NightLight.getDefault();

            initPlayer();
            Clipboard.getDefault();

            console.log("Colorshell: Initializing Wallpaper and Stylesheet modules");
            Wallpaper.getDefault();
            Stylesheet.getDefault();

            console.log("Adding runner plugins");
            runnerPlugins.forEach(plugin => Runner.addPlugin(plugin));

            createSubscription(
                secureBaseBinding<AstalWp.Endpoint>(
                    createBinding(AstalWp.get_default(), "defaultSpeaker"),
                    "volume",
                    null
                ),
                () => !Windows.getDefault().isOpen("control-center") &&
                    triggerOSD(OSDModes.sink)
            );

            createSubscription(
                secureBaseBinding<AstalWp.Endpoint>(
                    createBinding(AstalWp.get_default(), "defaultSpeaker"),
                    "mute",
                    null
                ),
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
                }),
                Notifications.getDefault().connect("notification-removed", (self) => {
                    self.notifications.length === 0 && Windows.getDefault().close("floating-notifications");
                })
            ]);

            defaultWindows.forEach(w => Windows.getDefault().open(w));
        });

        this.#scope.onCleanup(() => {
            console.log("Colorshell: disposing connections and quitting because of ::shutdown");
            this.#connections.forEach((ids, obj) => Array.isArray(ids) ?
                ids.forEach(id => obj.disconnect(id))
            : obj.disconnect(ids));
        });
    }

    quit(): void {
        this.release();
    }
}

Shell.getDefault().runAsync([ programInvocationName, ...programArgs ]);
