import "./overrides"; // thanks Aylur!!
import "./config";
import { Wallpaper } from "./modules/wallpaper";
import { Stylesheet } from "./modules/stylesheet";
import { Clipboard } from "./modules/clipboard";
import { Gdk, Gtk } from "ags/gtk4";
import { createRoot, getScope, Scope } from "ags";
import { OSD } from "./window/osd";
import { programArgs, programInvocationName } from "system";
import { setConsoleLogDomain } from "console";
import { cacheDir, createScopedConnection, dataDir, encoder, getDBusNamePID, globalScope, runtimeConfigDir, runtimeDir } from "./modules/utils";
import { NightLight } from "./modules/nightlight";
import { initCompositor } from "./compositors";
import { Input } from "./modules/input";
import { Idle } from "./modules/idle";
import { register } from "ags/gobject";
import { initWindows } from "./windows";
import SocketCli from "./cli/interface/socket";
import Media from "./modules/media";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";
import Cli from "./cli";


@register({ GTypeName: "Shell" })
export class Shell extends Adw.Application {
    private static instance: Shell;

    #scope!: Scope;
    #providers: Array<Gtk.CssProvider> = [];
    #pid: number|null = null;

    get pid() { return this.#pid; }
    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: COLORSHELL_VERSION,
        });

        setConsoleLogDomain("Colorshell");
        GLib.set_application_name("colorshell");
        GLib.set_prgname("colorshell");
        Cli.init();
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

    public removeProvider(provider: Gtk.CssProvider): boolean {
        if(!this.#providers.includes(provider))
            return false;

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

        return true;
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

    vfunc_activate(): void {
        this.hold();

        createRoot((dispose) => {
            createScopedConnection(this as Adw.Application, "shutdown", () => {
                globalScope.dispose()
                dispose();
            });

            // only init socket interface if this is the primary instance
            Cli.addIface(
                new SocketCli(Gio.UnixSocketAddress.new(`${runtimeDir.peek_path()!}/.sock`))
            );

            this.#scope = getScope();
            this.main();
        });
    }

    private init(): void {
        console.log("Colorshell: Initializing things");

        // create shell directories
        [
            runtimeDir,
            cacheDir,
            dataDir,
            runtimeConfigDir
        ].forEach(dir => {
            if(dir.query_exists(null))
                return;

            dir.make_directory_with_parents(null);
        });

        const pidFile = Gio.File.new_for_path(`${runtimeDir.peek_path()!}/.pid`);
        getDBusNamePID(
            "io.github.retrozinndev.colorshell",
            "/io/github/retrozinndev/colorshell",
            "org.freedesktop.Application"
        ).then((pid) => {
            this.#pid = pid;

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

            const file = Gio.File.new_for_path(`${runtimeConfigDir.peek_path()!}/${name}`);
            
            if(file.query_exists(null))
                return;
            
            file.replace_contents_bytes_async(
                Gio.resources_lookup_data(`/io/github/retrozinndev/colorshell/config/${name}`, null),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null,
                null
            );
        });
    }

    private main(): void {
        this.init();

        console.log("Colorshell: Initializing modules");
        initCompositor();
        Media.getDefault();
        Wallpaper.getDefault();
        Stylesheet.getDefault();

        initWindows();

        Clipboard.getDefault();
        Input.getDefault();
        NightLight.getDefault();
        Idle.getDefault();
        OSD.init();
    }

    quit(): void {
        this.release();
        super.quit();
    }
}

Shell.getDefault().runAsync([ programInvocationName, ...programArgs ]);
