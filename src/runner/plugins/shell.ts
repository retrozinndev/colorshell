import Runner from "..";
import Notifications from "../../modules/notifications";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


export class PluginShell implements Runner.Plugin {
    #shell = GLib.getenv("SHELL") ?? "/bin/sh";
    #procLauncher = Gio.SubprocessLauncher.new(
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );

    name = "Shell";
    prefix = '!';
    prioritize = true;


    constructor() {
        this.#procLauncher.set_cwd(GLib.get_home_dir());
    }

    handle(input: string) {
        let showOutputNotif: boolean = false;
        if(input.startsWith('!')) {
            input = input.replace('!', "");
            showOutputNotif = true;
        }

        const command = input ? GLib.shell_parse_argv(input) : undefined;
        const shellSplit = this.#shell.split('/'),
            shellName = shellSplit[shellSplit.length-1];

        return {
            onClicked: () => {
                if(!command?.[0] || !command[1]) return;

                const proc = this.#procLauncher.spawnv([ this.#shell, "-c", `${input}` ]);
                proc.communicate_utf8_async(null, null, (_, asyncResult) => {
                    const [ success, stdout, stderr ] = proc.communicate_utf8_finish(asyncResult);

                    if(!success || stderr) {
                        Notifications.getDefault().sendNotification({
                            appName: this.#shell,
                            summary: "Command error",
                            body: `An error occurred on \`${input}\`. Stderr: ${stderr}`
                        });

                        return;
                    }

                    if(!showOutputNotif) return;

                    Notifications.getDefault().sendNotification({
                        appName: this.#shell,
                        summary: "Command output",
                        body: stdout
                    });
                });
            },
            title: `Run ${input ? ` \`${input}\`` : `with ${shellName}`}`,
            description: input || showOutputNotif ? `${input ? `${this.#shell}\t` : ""}${
                showOutputNotif ? "(showing output on notification)" : "" }`
            : "",
            icon: "utilities-terminal-symbolic"
        } satisfies Runner.Result;
    }
}
