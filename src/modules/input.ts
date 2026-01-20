import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import IBus from "gi://IBus?version=1.0"
import { Notifications } from "./notifications";
import { exec } from "ags/process";


export class Input {
    private static instance: Input;

    #proc: Gio.Subprocess|null = null;

    /** how many times IBus has crashed */
    protected ibusAttempts: number = 0;
    /** if IBus crashes this much, this instance won't attempt to restart it again */
    public maxIbusAttempts: number = 5;


    constructor() {
        IBus.init();
        this.restartIBus();
    }

    /** @param keep whether to restart ibus after a crash (restart attempts are limited in {@link maxIbusAttempts}) */
    public restartIBus(keep: boolean = true): void {
        this.#proc = Gio.Subprocess.new(
            ["ibus-daemon", "--xim", "--replace", "--desktop", GLib.getenv("XDG_CURRENT_DESKTOP")?.toLowerCase()!, "--restart" ],
            Gio.SubprocessFlags.STDERR_PIPE | Gio.SubprocessFlags.STDOUT_PIPE
        );

        this.#proc.wait_async(null, (self, res) => {
            try {
                self!.wait_finish(res);
            } catch(e) {
                if(this.ibusAttempts === this.maxIbusAttempts) {
                    Notifications.getDefault().sendNotification({
                        appName: "colorshell",
                        summary: "Failed to restore IBus",
                        body: `Attempted to restart IBus, but it crashed in all the ${this.maxIbusAttempts
                            } tries, try checking for a config error or a dependency in fault.`
                    });

                    return;
                }

                Notifications.getDefault().sendNotification({
                    appName: "colorshell",
                    summary: "IBus crashed",
                    body: `An error occurred and IBus had to exit: ${(e as Error).message
                        }${keep ? ". The daemon will be automatically restarted" : ""}`
                });

                keep && this.restartIBus();
            }
        });
    }

    public exitIBus(): void {
        try {
            exec("ibus exit");
        } catch(e) {
            console.error("Input: IBus: Failed to exit the IBus Daemon:", e);
        }
    }

    public async exitIBusAsync(): Promise<void> {
        return new Promise((resolve, reject) => {
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                try {
                    this.exitIBus();
                    resolve();
                } catch(e) {
                    reject(e);
                }

                return false;
            });
        });
    }

    public static getDefault(): Input {
        if(!this.instance)
            this.instance = new Input();

        return this.instance;
    }
}
