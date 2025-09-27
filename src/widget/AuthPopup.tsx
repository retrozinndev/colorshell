import { Astal, Gtk } from "ags/gtk4";
import { CustomDialog, getContainerCustomDialog } from "./CustomDialog";

import GLib from "gi://GLib?version=2.0";


export type AuthPopupData = {
    user: string;
    hidePassword: boolean;
    passwd: string;
};

export function AuthPopup(props: {
    /** hide password on showup. @default true */
    hidePassword?: boolean;
    /** icon name of the application that's requesting this popup */
    iconName?: string;
    /** popup body */
    text: string;
    /** selected user by default */
    user?: string;
    /** approve data after the user clicks the "grant permission" button */
    onContinue: (data: AuthPopupData, reject: (message: string) => void, approve: () => void) => void;
}): Astal.Window {
    const data = {
        passwd: "",
        user: props.user ?? GLib.get_user_name(),
        hidePassword: props.hidePassword ?? true
    } satisfies AuthPopupData;
    const allowUserChange = props.user === undefined;

    const dialog = <CustomDialog title={"Authentication"} text={props.text}
      namespace={"auth-popup"} options={[
          { text: "Deny" }, // will close and call onFinish by default
          {
              text: "Grant permission",
              onClick: () => {
                  if(allowUserChange)
                      data.user = userEntry!.text;

                  data.passwd = passwordEntry.text;
                  data.hidePassword = passwordEntry.showPeekIcon;

                  props.onContinue(data, 
                      // rejected by checker function
                      (m) => {
                          // show error to user
                          !messageLabel.is_visible &&
                              messageLabel.set_visible(true);
                          messageLabel.set_label(m);

                          // clear password entry
                          passwordEntry.set_text("");
                      }, 
                      // approved by the checker
                      dialog.close
                );
              },
              closeOnClick: false
          }
      ]}>

        <Gtk.Entry class={"user"} placeholderText={"User"} visible={allowUserChange} />
        <Gtk.PasswordEntry class={"password"} showPeekIcon placeholderText={"Password"} />

        <Gtk.Label class={"message"} label={""} />
    </CustomDialog> as Astal.Window;
    const messageLabel = getContainerCustomDialog(dialog).get_last_child() as Gtk.Label;
    const userEntry = allowUserChange ? getContainerCustomDialog(dialog).get_first_child() as Gtk.Entry : undefined;
    const passwordEntry = getContainerCustomDialog(dialog).get_first_child()?.get_next_sibling() as Gtk.PasswordEntry;

    return dialog;
}
