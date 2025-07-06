import { Accessor } from "ags";
import { tr } from "../i18n/intl";
import { CustomDialog } from "./CustomDialog";
import { Astal, Gtk } from "ags/gtk4";

export type EntryPopupProps = {
    title: string | Accessor<string>;
    text?: string | Accessor<string>;
    cancelText?: string | Accessor<string>;
    acceptText?: string | Accessor<string>;
    closeOnAccept?: boolean;
    entryPlaceholder?: string | Accessor<string>;
    onAccept: (userInput: string) => void;
    onCancel?: () => void;
    onFinish?: () => void;
    isPassword?: boolean | Accessor<string>;
};

export function EntryPopup(props: EntryPopupProps): Astal.Window {
    props.closeOnAccept = props.closeOnAccept ?? true;
    let entered: boolean = false;

    function onActivate(entry: Gtk.Entry|Gtk.PasswordEntry) {
        props.closeOnAccept && window.close();
        entered = true;
        props.onAccept(entry.text);
        entry.text = "";
    }

    const entry = props.isPassword ? 
        <Gtk.PasswordEntry class={"password"} xalign={.5} 
          placeholderText={props.entryPlaceholder} 
          onActivate={onActivate}
        /> as Gtk.PasswordEntry
    : <Gtk.Entry xalign={.5} placeholderText={props.entryPlaceholder}
        onActivate={onActivate} /> as Gtk.Entry;

    const window = <CustomDialog namespace={"entry-popup"} widthRequest={420} 
      heightRequest={220} title={props.title} text={props.text}
      options={[
          {
              text: props.cancelText ?? tr("cancel"),
              onClick: props.onCancel
          },
          {
              text: props.acceptText ?? tr("accept"),
              closeOnClick: props.closeOnAccept,
              onClick: () => {
                  entered = true;
                  props.onAccept(entry.text);
                  entry.text = "";
              }
          }
      ]} onFinish={() => {
          !entered && props.onCancel?.()
          props.onFinish?.();
      }} 
    /> as Astal.Window;

    return window;
} 
