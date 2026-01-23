import { exec } from "ags/process";
import Gio from "gi://Gio?version=2.0";
import { Notifications } from "./notifications";


export class Input {
    private static instance: Input;

    #proc: Gio.Subprocess|null = null;

    /** how many times the IME has crashed */
    protected attempts: number = 0;
    /** if the IME crashes this much, this instance won't attempt to start it again */
    public maxAttempts: number = 5;


    constructor() {
        this.restart();
    }

    public static getDefault(): Input {
        if(!this.instance)
            this.instance = new Input();

        return this.instance;
    }

    /** @param keep whether to restart the IME daemon after a crash/exit (restart attempts are limited by {@link maxIbusAttempts}) */
    public restart(keep: boolean = true): void {
        if(this.#proc)
            return;

        this.#proc = Gio.Subprocess.new(
            ["fcitx5", "-r", "-s", "2"],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
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

    /** force the IME daemon to quit */
    public exit(): void {
        try {
            exec("fcitx5-remote --check -e");
        } catch(e) {
            // so we throw a prettier error
            throw new Error("Input: Fcitx5: Failed to quit the daemon. Is it running?");
        }
    }

    protected getDaemonPid(): number|null {
        try {
            const str = exec("pgrep '^fcitx5$' | head -n1")?.trim();
            if(str.trim() === "") 
                return null;

            return Number.parseInt(str.trim());
        } catch(e) {
            return null;
        }
    }
}
