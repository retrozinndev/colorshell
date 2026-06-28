import { Gtk } from "ags/gtk4";
import Cli from "..";
import Compositor from "../../compositor";
import Cache from "../../modules/cache";


const devel = {
    prefix: "dev",
    help: "Development tools to help debugging colorshell",
    arguments: [],
    commands: [
        {
            name: "inspector",
            help: "open the gtk's visual inspector",
            onCalled (remote) {
                Gtk.Window.set_interactive_debugging(true);
                remote.println("Opening GTK Inspector...");
                remote.exit(0);
            }
        },
        {
            name: "cache",
            help: "print the cache module's entries",
            onCalled(remote) {
                if(Cache.getDefault().getSections().length < 1) {
                    remote.println("No cached entries");
                    remote.exit(0);
                    return;
                }

                remote.println("Cached entries:");
                const cache = Cache.getDefault().getSections().map(s =>
                    `\"${s}\": {
${Cache.getDefault().getItems(s)!.map(k =>
    " ".repeat(4) + `\"${k}\": ${
        String(Cache.getDefault().getItem(s, k)).replace(/\n/g, " ".repeat(4) + "$&")
    }`
).join(",\n")}
}`
                ).join(",\n");

                remote.println(cache);
                remote.exit(0);
            }
        },
        {
            name: "clients",
            help: "print currently-open compositor clients",
            onCalled(remote) {
                remote.println(Compositor.getDefault().clients.map(c => String(c)).join(",\n"));
                remote.exit(0);
            }
        },
        {
            name: "workspaces",
            help: "print compositor workspaces",
            onCalled(remote) {
                remote.println(Compositor.getDefault().workspaces.map(w => String(w)).join(",\n"));
                remote.exit(0);
            }
        },
        {
            name: "monitors",
            help: "print compositor monitors",
            onCalled(remote) {
                remote.println(Compositor.getDefault().monitors.map(m => String(m)).join(",\n"));
                remote.exit(0);
            }
        }
    ]
} satisfies Cli.Module;

devel.help = Cli.genHelp(devel);

export default devel;
