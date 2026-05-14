import Cli from "..";
import Screenshot from "../../modules/screenshot";


export default {
    prefix: "screenshot",
    help: `\
Take a screenshot of a specific(or full) display region.
If no command is provided, the default region-selection behavior will be used.

Commands:
  full: take a full screenshot of your display
  active: take a screenshot of the active/focused window's region
`.trimEnd(),

    onCalled: (remote, cmd) => {
        if(cmd)
            return;

        remote.println("Please, select a region to take the screenshot from");
        Screenshot.getDefault().take().catch(console.error);
        remote.exit(0);
    },

    commands: [
        {
            name: "full",
            help: "Take a full screenshot of your display",
            onCalled: (remote) => {
                remote.println("Taking a full screenshot...");
                Screenshot.getDefault().take(Screenshot.Mode.FULL).catch(console.error);
                remote.exit(0);
            }
        },
        {
            name: "active",
            help: "Take a screenshot of the active/focused window's region",
            onCalled: (remote) => {
                remote.println("Taking screenshot of active(focused) window...");
                Screenshot.getDefault().take(Screenshot.Mode.ACTIVE_WINDOW).catch(console.error);
                remote.exit(0);
            }
        }
    ]
} satisfies Cli.Module;
