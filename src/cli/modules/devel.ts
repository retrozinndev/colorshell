import { Gtk } from "ags/gtk4";
import { Cli } from "..";


export default {
    prefix: "dev",
    help: "development tools to help debugging colorshell",
    commands: [{
        name: "inspector",
        help: "open the gtk's visual inspector",
        onCalled: (print) => {
            Gtk.Window.set_interactive_debugging(true);
            print({
                content: "Opening GTK Inspector...",
                type: "out"
            });
        }
    }]
} satisfies Cli.Module;
