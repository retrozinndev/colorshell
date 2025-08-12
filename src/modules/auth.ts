import { execAsync, Gio, GLib, register } from "astal";
import Polkit from "gi://Polkit";
import PolkitAgent from "gi://PolkitAgent";
import { EntryPopup, EntryPopupProps } from "../widget/EntryPopup";
import AstalAuth from "gi://AstalAuth";
import { AskPopup, AskPopupProps } from "../widget/AskPopup";

export { Auth };

@register({ GTypeName: "AuthAgent" })
class Auth extends PolkitAgent.Listener {
    private static instance: Auth;
    #subject: Polkit.Subject;

    constructor() {
        super();
        this.#subject = Polkit.UnixSession.new(GLib.get_user_name());

        this.register(PolkitAgent.RegisterFlags.NONE, 
            this.#subject, 
            "/io/github/retrozinndev/Colorshell/PolicyKit/AuthAgent", 
            null
        );
    }

    vfunc_dispose() {
        PolkitAgent.Listener.unregister();
    }

    static initiate_authentication(action_id: string, message: string, icon_name: string, details: Polkit.Details, cookie: string, identities: Array<Polkit.Identity>, cancellable?: Gio.Cancellable, callback?: Gio.AsyncReadyCallback): void | Promise<boolean> {
        const authPopup = EntryPopup({
            title: "Authentication",
            text: message,
            isPassword: true,
            onFinish: callback,
            onCancel: () => cancellable?.cancel(),
            closeOnAccept: false,
            onAccept: (input: string) => {
                if(this.validatePasswd(input)) {
                    authPopup.close();
                }
                AskPopup({

                } as AskPopupProps)
            }
        } as EntryPopupProps);
    }


    public static initAgent(): Auth {
        if(!this.instance)
            this.instance = new Auth();

        return this.instance;
    }

    private static validatePasswd(passwd: string): boolean {
        return AstalAuth.Pam.authenticate(passwd, null);
    }

    /** @returns if successful, true, or else, false */
    public async polkitExecute(cmd: string | Array<string>): Promise<boolean> {
        let success: boolean = true;
        await execAsync([ "pkexec", "--", ...(Array.isArray(cmd) ? 
          cmd as Array<string> : [ cmd as string ]) ]
        ).catch((r) => {
            success = false;
            console.error(`Polkit: Couldn't authenticate. Stderr: ${r}`);
        });

        return success;
    }
}
