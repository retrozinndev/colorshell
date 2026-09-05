import "./pkg";
import { Gdk, Gtk } from "ags/gtk4";
import { createRoot, getScope, Scope } from "ags";
import { programArgs, programInvocationName } from "system";
import { setConsoleLogDomain } from "console";
import {
    cacheDir,
    createScopedConnection,
    dataDir,
    decoder,
    encoder,
    getDBusNamePID,
    globalScope,
    runtimeDir
} from "./modules/utils";
import Clipboard from "./modules/clipboard";
import NightLight from "./modules/nightlight";
import { initCompositor } from "./compositors";
import { register } from "ags/gobject";
import { initWindows } from "./windows";
import { initCli } from "./cli/init";
import Cli from "./cli";
import SocketCli from "./cli/interface/socket";
import StyleManager from "./modules/stylemanager";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";


@register({ GTypeName: "Colorshell" })
export default class Shell extends Adw.Application {
    private static instance: Shell;

    /** LD_PRELOAD environment variable. used by the `reload` command,
      * so the shell behaves as a layer shell instead of common clients */
    readonly preload: string|null = GLib.getenv("LD_PRELOAD");

    #scope!: Scope;
    #pid: number|null = null;

    get pid() { return this.#pid; }
    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.Colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: VERSION,
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

    private initHyprlockConfig(): void {
        if([
            GLib.get_user_config_dir(),
            `${GLib.get_home_dir()}/.config`,
            ...GLib.get_system_config_dirs()
        ].some(dir => Gio.File.new_for_path(
            `${dir}/hypr/hyprlock.conf`
        ).query_exists(null)))
            return;

        const file = Gio.File.new_for_path(
            `${GLib.get_user_config_dir()}/hypr/hyprlock.conf`
        );

        try {
            const parent = file.get_parent();
            if(parent && !parent.query_exists(null))
                parent.make_directory_with_parents(null);

            const template = decoder.decode(Gio.resources_lookup_data(
                "/io/github/retrozinndev/Colorshell/config/hyprlock.conf",
                Gio.ResourceLookupFlags.NONE
            ).toArray());
            const data = encoder.encode(template.replace(
                "@colorshellPalette@",
                `${cacheDir.peek_path()!}/colorends/pywal16/colors-hyprland.conf`
            ));

            const stream = file.create(Gio.FileCreateFlags.NONE, null);
            const [success, written] = stream.write_all(data, null);
            stream.close(null);

            if(!success || written !== data.length)
                console.error("Couldn't write the complete default Hyprlock config");
        } catch(error) {
            console.error("Couldn't create the default Hyprlock config", error);
        }
    }

    vfunc_activate(): void {
        this.hold();

        createRoot((dispose) => {
            createScopedConnection(this as Adw.Application, "shutdown", () => {
                globalScope.dispose();
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
        console.log("Preparing init");

        // remove layer-shell preload, so child processes behave as usual
        GLib.unsetenv("LD_PRELOAD");

        // create shell directories
        [
            runtimeDir,
            cacheDir,
            dataDir
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
            const gresourcesPath: string = !/^\//.test(GRESOURCE) ?
                (GRESOURCE.split('/').filter(s => s !== "").map(path => {
                    // support environment variables at runtime
                    if(/^\$/.test(path)) {
                        const env = GLib.getenv(path.replace(/^\$/, ""));
                        if(env === null)
                            throw new Error(`Couldn't get environment variable: ${path}`);

                        return env;
                    }
                    return path;
                }).join('/'))
            : GRESOURCE;

            const gresource = Gio.Resource.load(gresourcesPath);
            Gio.resources_register(gresource);
        } catch(_e) {
            const e = _e as Error;
            console.error(`Error: couldn't load gresource! Stderr: ${e.message}\n${e.stack}`);
        }

        // add icons 
        Gtk.IconTheme.get_for_display(Gdk.Display.get_default()!)
            .add_resource_path("/io/github/retrozinndev/Colorshell/icons")

        this.initHyprlockConfig();
    }

    private main(): void {
        this.init();

        console.log("Initializing main modules...");

        StyleManager.init();
        Clipboard.init();
        initCompositor();
        initWindows();
        NightLight.init();
    }

    quit(): void {
        this.release();
        Cli.deinit();
        Clipboard.deinit();
        super.quit();
    }
}

Shell.getDefault().runAsync([ programInvocationName, ...programArgs ]);
