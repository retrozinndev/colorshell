import { exec } from "ags/process";
import Gio from "gi://Gio?version=2.0";
import { Notifications } from "./notifications";
import { getPID, isInstalled, killProc } from "./utils";


export class Input {
    private static instance: Input;
    #proc: Gio.Subprocess|null = null;

    /** how many times the IME has crashed */
    protected attempts: number = 0;
    /** if the IME crashes this much, this instance won't attempt to start it again */
    public maxAttempts: number = 5;


    constructor() {
        if(!isInstalled("fcitx5"))
            return;

        const pid = getPID("fcitx5");
        if(pid != null)
            killProc(pid);

        this.restart();
    }

    public static getDefault(): Input {
        if(!this.instance)
            this.instance = new Input();

        return this.instance;
    }

    /** force the IME daemon to quit */
    public exit(): void {
        try {
            exec("fcitx5-remote --check -e");
        } catch(e) {
            // so we throw a prettier error
            throw new Error("Input: Fcitx5: Failed to quit the daemon. Is it running?");
        }
    }

    /** @param keep whether to restart the IME daemon after a crash/exit (restart attempts are limited by {@link maxIbusAttempts}) */
    public restart(keep: boolean = true): void {
        if(this.#proc)
            return;

        this.#proc = Gio.Subprocess.new(
            ["fcitx5", "-r"],
            Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE
        );

        this.#proc.wait_async(null, (_, res) => {
            try {
                this.#proc!.wait_finish(res);
            } catch(e) {
                if(this.attempts === this.maxAttempts) {
                    Notifications.getDefault().sendNotification({
                        appName: "colorshell",
                        summary: "Failed to restore IME",
                        body: `Attempted to restart the IME Daemon, but it crashed in all the ${this.maxAttempts
                            } tries, try checking for a config error or a dependency in fault.`
                    });

                    return;
                }

                Notifications.getDefault().sendNotification({
                    appName: "colorshell",
                    summary: "IME crashed",
                    body: `An error occurred and the Daemon had to exit: ${(e as Error).message
                        }${keep ? ". The daemon will be automatically restarted" : ""}`
                });

                keep && this.restart(keep);
            }

            console.log("Input: Fcitx5: Exited normally");
        });
    }
}
