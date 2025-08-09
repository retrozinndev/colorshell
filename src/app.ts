// fix ags needing --gtk 4
// import app from "ags/gtk4/app";

import { 
    PluginApps, 
    PluginClipboard, 
    PluginMedia, 
    PluginShell, 
    PluginWallpapers, 
    PluginWebSearch
} from "./runner/plugins";

import { Wireplumber } from "./scripts/volume";
import { handleArguments } from "./scripts/arg-handler";
import { Runner } from "./runner/Runner";
import { Windows } from "./windows";
import { Notifications } from "./scripts/notifications";
import { Wallpaper } from "./scripts/wallpaper";
import { Stylesheet } from "./scripts/stylesheet";
import { Clipboard } from "./scripts/clipboard";
import { Config } from "./scripts/config";
import { Gdk, Gtk } from "ags/gtk4";
import { createRoot, getScope } from "ags";
import { triggerOSD } from "./window/OSD";
import { programArgs, programInvocationName } from "system";
import { encoder, decoder } from "./scripts/utils";

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

const defaultWindows: Array<string> = [];

Adw.init();

@register({ GTypeName: "Shell" })
export class Shell extends Gtk.Application {
    private static instance: Shell;

    #loop!: GLib.MainLoop;
    #scope!: ReturnType<typeof getScope>;
    #stylesheet: Uint8Array|undefined;
    #styleProvider: Gtk.CssProvider;

    get scope() { return this.#scope; }

    constructor() {
        super({
            applicationId: "io.github.retrozinndev.colorshell",
            flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
            version: "1.1.0",
        });

        this.#styleProvider = Gtk.CssProvider.new();
    }

    public static getDefault(): Shell {
        if(!this.instance)
            this.instance = new Shell();

        return this.instance;
    }

    public resetStyle(): void {
        this.#stylesheet = undefined;
        Gtk.StyleContext.remove_provider_for_display(
            Gdk.Display.get_default()!,
            this.#styleProvider
        );
    }

    public applyStyle(stylesheet: string): void {
        const previous = this.#stylesheet ? decoder.decode(this.#stylesheet) : undefined;
        let final = "";

        if(previous)
            final = previous + "\n";

        this.#stylesheet = encoder.encode(stylesheet);
        final = final.concat(stylesheet);

        this.#styleProvider.load_from_string(final);

        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default()!,
            this.#styleProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
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
            if(args[1]) {
                printerr("Error: colorshell not running. Try to clean-run before using arguments");
                return 1;
            }

            this.main();
        }
        
        return 0;
    }

    private main(): void {
        this.#loop = GLib.MainLoop.new(null, false);
        const connections = new Map<GObject.Object, Array<number> | number>();

        connections.set(this, this.connect("shutdown", () => this.#scope.dispose()));
        createRoot(() => {
            console.log(`Colorshell: initializing`);
            this.#scope = getScope();

            Stylesheet.getDefault().compileApply();

            // Init clipboard module
            Clipboard.getDefault();

            console.log("Initializing wallpaper handler");
            Wallpaper.getDefault();

            console.log("Adding runner plugins");
            runnerPlugins.forEach(plugin => Runner.addPlugin(plugin));

            connections.set(Wireplumber.getDefault(), 
                Wireplumber.getDefault().getDefaultSink().connect("notify::volume", () => 
                    triggerOSD())
            );

            connections.set(Notifications.getDefault(), [
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
            connections.forEach((ids, obj) => Array.isArray(ids) ?
                ids.forEach(id => obj.disconnect(id))
            : obj.disconnect(ids));
        });

        this.#loop.run();
    }

    quit(): void {
        this.#loop.is_running() && this.#loop.quit();
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
