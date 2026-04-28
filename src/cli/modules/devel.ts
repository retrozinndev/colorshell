import { Gtk } from "ags/gtk4";
import Cli from "..";


const devel = {
    prefix: "dev",
    help: "Development tools to help debugging colorshell",
    arguments: [],
    commands: [{
        name: "inspector",
        help: "open the gtk's visual inspector",
        onCalled: (remote) => {
            Gtk.Window.set_interactive_debugging(true);
            remote.println("Opening GTK Inspector...");
            remote.exit(0);
        }
    }]
} satisfies Cli.Module;

devel.help = Cli.genHelp(devel);

export default devel;
