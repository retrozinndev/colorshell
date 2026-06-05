import { Gtk } from "ags/gtk4";
import Cli from "..";
import Compositor from "../../compositor";


const devel = {
    prefix: "dev",
    help: "Development tools to help debugging colorshell",
    arguments: [],
    commands: [
        {
            name: "inspector",
            help: "open the gtk's visual inspector",
            onCalled: (remote) => {
                Gtk.Window.set_interactive_debugging(true);
                remote.println("Opening GTK Inspector...");
                remote.exit(0);
            }
        },
        {
            name: "clients",
            help: "print currently-open compositor clients",
            onCalled: (remote) => {
                remote.println(Compositor.getDefault().clients.map(c => String(c)).join(",\n"));
                remote.exit(0);
            }
        },
        {
            name: "workspaces",
            help: "print compositor workspaces",
            onCalled: (remote) => {
                remote.println(Compositor.getDefault().workspaces.map(w => String(w)).join(",\n"));
                remote.exit(0);
            }
        },
        {
            name: "monitors",
            help: "print compositor monitors",
            onCalled: (remote) => {
                remote.println(Compositor.getDefault().monitors.map(m => String(m)).join(",\n"));
                remote.exit(0);
            }
        }
    ]
} satisfies Cli.Module;

devel.help = Cli.genHelp(devel);

export default devel;
