import { Runner } from "../Runner";
import { Notifications } from "../../modules/notifications";

import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";


export const PluginShell = (() => {

    const shell = GLib.getenv("SHELL") ?? "/bin/sh";
    const procLauncher = Gio.SubprocessLauncher.new(
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

    procLauncher.set_cwd(GLib.get_home_dir());

    return {
        prefix: '!',
        prioritize: true,
        handle: (input) => {
            let showOutputNotif: boolean = false;
            if(input.startsWith('!')) {
                input = input.replace('!', "");
                showOutputNotif = true;
            }

            const command = input ? GLib.shell_parse_argv(input) : undefined;
            const shellSplit = shell.split('/'),
                shellName = shellSplit[shellSplit.length-1];

            return {
                actionClick: () => {
                    if(!command?.[0] || !command[1]) return;

                    const proc = procLauncher.spawnv([ shell, "-c", `${input}` ]);
                    proc.communicate_utf8_async(null, null, (_, asyncResult) => {
                        const [ success, stdout, stderr ] = proc.communicate_utf8_finish(asyncResult);

                        if(!success || stderr) {
                            Notifications.getDefault().sendNotification({
                                appName: shell,
                                summary: "Command error",
                                body: `An error occurred on \`${input}\`. Stderr: ${stderr}`
                            });

                            return;
                        }

                        if(!showOutputNotif) return;

                        Notifications.getDefault().sendNotification({
                            appName: shell,
                            summary: "Command output",
                            body: stdout
                        });
                    });
                },
                title: `Run ${input ? ` \`${input}\`` : `with ${shellName}`}`,
                description: input || showOutputNotif ? `${input ? `${shell}\t` : ""}${
                    showOutputNotif ? "(showing output on notification)" : "" }`
                : "",
                icon: "utilities-terminal-symbolic"
            };
        }
    } as Runner.Plugin
})();
