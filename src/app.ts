import "./overrides"; // thanks Aylur!!
import "./config";
import { Gdk, Gtk } from "ags/gtk4";
import { createRoot, getScope, Scope } from "ags";
import { programArgs, programInvocationName } from "system";
import { setConsoleLogDomain } from "console";
import { cacheDir, createScopedConnection, dataDir, encoder, getDBusNamePID, globalScope, runtimeConfigDir, runtimeDir } from "./modules/utils";
import Clipboard from "./modules/clipboard";
import { OSD } from "./window/osd";
import NightLight from "./modules/nightlight";
import { initCompositor } from "./compositors";
import Idle from "./modules/idle";
import { register } from "ags/gobject";
import { initWindows } from "./windows";
import { initCli } from "./cli/init";
import Cli from "./cli";
import SocketCli from "./cli/interface/socket";
import StyleManager from "./modules/stylemanager";
import Media from "./modules/media";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";


@register({ GTypeName: "Colorshell" })
export class Shell extends Adw.Application {
    private static instance: Shell;

    #scope!: Scope;
    #pid: number|null = null;

    get pid() { return this.#pid; }
    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.Colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: COLORSHELL_VERSION,
        });

        setConsoleLogDomain("Colorshell");
        GLib.set_application_name("Colorshell");
        GLib.set_prgname("colorshell");
        initCli();
    }

    public static getDefault(): Shell {
        if(!this.instance)
            this.instance = new Shell();

        return this.instance;
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
            "io.github.retrozinndev.Colorshell",
            "/io/github/retrozinndev/Colorshell",
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
            .add_resource_path("/io/github/retrozinndev/Colorshell/icons")

        Gio.resources_enumerate_children(
            "/io/github/retrozinndev/Colorshell/config",
            Gio.ResourceLookupFlags.NONE
        ).forEach(name => {
            if(!/\..*$/.test(name))
                return;

            const file = Gio.File.new_for_path(`${runtimeConfigDir.peek_path()!}/${name}`);
            
            if(file.query_exists(null))
                return;
            
            file.replace_contents_bytes_async(Gio.resources_lookup_data(
                `/io/github/retrozinndev/Colorshell/config/${name}`, Gio.ResourceLookupFlags.NONE
            ), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null, null);
        });
    }

    private main(): void {
        this.init();

        console.log("Colorshell: Initializing modules");
        StyleManager.init();
        initCompositor();
        Media.getDefault();

        initWindows();

        Clipboard.getDefault();
        NightLight.getDefault();
        Idle.getDefault();
        OSD.init();
    }

    quit(): void {
        this.release();
        Cli.deinit();
        super.quit();
    }
}

Shell.getDefault().runAsync([ programInvocationName, ...programArgs ]);
