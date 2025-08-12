// fix ags needing --gtk 4
// import app from "ags/gtk4/app";

// fix can't convert non-null pointer to JS value (thanks Aylur!)
import "ags/overrides";
import { 
    PluginApps, 
    PluginClipboard, 
    PluginMedia, 
    PluginShell, 
    PluginWallpapers, 
    PluginWebSearch
} from "./runner/plugins";
import { Wireplumber } from "./modules/volume";
import { handleArguments } from "./modules/arg-handler";
import { Runner } from "./runner/Runner";
import { Windows } from "./windows";
import { Notifications } from "./modules/notifications";
import { Wallpaper } from "./modules/wallpaper";
import { Stylesheet } from "./modules/stylesheet";
import { Clipboard } from "./modules/clipboard";
import { Config } from "./modules/config";
import { Gdk, Gtk } from "ags/gtk4";
import { createRoot, getScope } from "ags";
import { triggerOSD } from "./window/OSD";
import { programArgs, programInvocationName } from "system";
import { setConsoleLogDomain } from "console";
import { initPlayer } from "./modules/media";
import GObject, { register } from "ags/gobject";

import AstalNotifd from "gi://AstalNotifd";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Adw from "gi://Adw?version=1";


const runnerPlugins: Array<Runner.Plugin> = [
    PluginApps,
    PluginShell,
    PluginWebSearch,
    PluginMedia,
    PluginWallpapers,
    PluginClipboard
];

const defaultWindows: Array<string> = [ "bar" ];

Gtk.init();
Adw.init();
GLib.unsetenv("LD_PRELOAD");

@register({ GTypeName: "Shell", Implements: [Gio.ActionGroup]})
export class Shell extends Adw.Application implements Gio.ActionMap {
    private static instance: Shell;

    #scope!: ReturnType<typeof getScope>;
    #connections = new Map<GObject.Object, Array<number> | number>();
    #providers: Array<Gtk.CssProvider> = [];
    #gresource: Gio.Resource|null = null;

    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: COLORSHELL_VERSION ?? "0.0.0-unknown",
        });

        setConsoleLogDomain("colorshell");

        try {
            // load gresource from build-defined value + support env variables
            this.#gresource = Gio.Resource.load(GRESOURCES_FILE.split('/').filter(s => 
                s !== ""
            ).map(path => {
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

        // create action for gapplication to handle commands via dbus 
        // (faster than running a remote instance to send arguments)
        // TODO: implement support for argument parsing through dbus
        const msgAction = Gio.SimpleAction.new("msg", null);
        this.add_action(msgAction);
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
        const args = cmd.get_arguments();
        args.splice(0, 1); // remove executable

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
        super.vfunc_activate();
        this.hold();
        this.main();
    }

    private main(): void {
        createRoot((dispose) => {
            console.log(`Colorshell: Initializing things`);
            this.#connections.set(this, this.connect("shutdown", () => dispose()));
            this.#scope = getScope();

            initPlayer();
            Clipboard.getDefault();

            console.log("Colorshell: Initializing wallpaper & Stylesheet handlers");
            Wallpaper.getDefault();
            Stylesheet.getDefault();

            console.log("Adding runner plugins");
            runnerPlugins.forEach(plugin => Runner.addPlugin(plugin));

            this.#connections.set(Wireplumber.getDefault(), 
                Wireplumber.getDefault().getDefaultSink().connect("notify::volume", () => 
                    triggerOSD())
            );

            this.#connections.set(Notifications.getDefault(), [
                Notifications.getDefault().connect("notification-added", (_, _notif: AstalNotifd.Notification) => {
                    Windows.getDefault().open("floating-notifications");
                }),
                Notifications.getDefault().connect("notification-removed", (_: Notifications, _id: number) => {
                    _.notifications.length === 0 && Windows.getDefault().close("floating-notifications");
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
        super.quit();
    }
}


const generalConfigDefaults = {
    notifications: {
        timeout_low: 4000,
        timeout_normal: 6000,
        timeout_critical: 0
    },

    night_light: {
        /** whether to save night light values to disk */
        save_on_shutdown: true
    },

    workspaces: {
        /** breaks `enable_helper`, makes all workspaces show their respective ID 
        * by default */
        always_show_id: false,
        /** this is the function that shows the Workspace's IDs 
        * around the current workspace if one breaks the crescent order.
        * It basically helps keyboard navigation between workspaces.
        * ---
        * Example: 1(empty, current, shows ID), 2(empty, does not appear(makes 
        * the previous not to be in a crescent order)), 3(not empty, shows ID) */
        enable_helper: true
    },

    clock: {
        /** use the same format as gnu's `date` command */
        date_format: "%A %d, %H:%M"
    },

    misc: {
        play_bell_on_volume_change: true
    }
};

export const generalConfig = new Config<keyof typeof generalConfigDefaults, 
    typeof generalConfigDefaults[keyof typeof generalConfigDefaults]>(
        `${GLib.get_user_config_dir()}/colorshell/config.json`, generalConfigDefaults
);

Shell.getDefault().runAsync([ programInvocationName, ...programArgs ]);
