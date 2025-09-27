import { exec, execAsync } from "ags/process";
import { register } from "ags/gobject";
import { AuthPopup } from "../widget/AuthPopup";

import AstalAuth from "gi://AstalAuth";
import Polkit from "gi://Polkit";
import PolkitAgent from "gi://PolkitAgent";
import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";


@register({ GTypeName: "AuthAgent" })
export class Auth extends PolkitAgent.Listener {
    private static instance: Auth;
    #subject: Polkit.Subject;
    #pam: AstalAuth.Pam;
    #handle: any;

    constructor() {
        super();
        this.#subject = Polkit.UnixSession.new(""); // TODO find how to get session id (for some reason, i can't find a session ID that works)
        this.#pam = new AstalAuth.Pam();

        this.#handle = this.register(
            PolkitAgent.RegisterFlags.RUN_IN_THREAD, 
            this.#subject, 
            "/io/github/retrozinndev/colorshell/PolicyKit/AuthAgent", 
            null
        );
    }

    vfunc_dispose() {
        PolkitAgent.Listener.unregister(this.#handle);
    }

    public static initiate_authentication(action_id: string, message: string, icon_name: string, details: Polkit.Details, cookie: string, identities: Array<Polkit.Identity>, cancellable: Gio.Cancellable|null, callback: Gio.AsyncReadyCallback<Auth>|null): void {
        const task = Gio.Task.new(
            this.getDefault(), 
            cancellable, 
            callback as Gio.AsyncReadyCallback|null
        );

        AuthPopup({
            text: message,
            iconName: icon_name,
            onContinue: (data, reject, approve) => {
                this.getDefault().validateAuth(data.passwd, data.user).then((success) => {
                    approve();
                    task.return_boolean(success);
                }).catch((error: GLib.Error) => {
                    // TODO implement a number of tries (usually it's 3)
                    reject(`Authentication failed: ${error.message}`);
                    task.return_error(error);
                });
            }
        });

    }


    public static initAgent(): Auth {
        if(!this.instance)
            this.instance = new Auth();

        return this.instance;
    }

    // TODO: support fingerprint/facial auth
    /** @returns true if data are correct, rejects promise otherwise */
    public validateAuth(passwd: string, user?: string): Promise<boolean> {
        if(user !== undefined)
            this.#pam.username = user;

        return new Promise<boolean>((resolve, reject) => {
            const connections: Array<number> = [];
            connections.push(
                this.#pam.connect("fail", () => {
                    reject(
                        `Auth: Authentication has failed for user ${this.#pam.username}`
                    );
                    connections.forEach(id => this.#pam.disconnect(id));
                }),
                this.#pam.connect("success", () => {
                    resolve(true);
                    connections.forEach(id => this.#pam.disconnect(id));
                })
            );

            this.#pam.start_authenticate();
            this.#pam.supply_secret(passwd);
        });
    }

    /** @returns true if successful */
    public async polkitExecute(cmd: string | Array<string>): Promise<boolean> {
        let success: boolean = true;
        await execAsync([ 
            "pkexec", 
            "--", 
            ...(Array.isArray(cmd) ? cmd : [ cmd ]) ]
        ).catch((r) => {
            success = false;
            console.error(`Polkit: Couldn't authenticate. Stderr: ${r}`);
        });

        return success;
    }

    public static getDefault(): Auth {
        if(!this.instance)
            this.instance = new Auth();

        return this.instance;
    }
}
