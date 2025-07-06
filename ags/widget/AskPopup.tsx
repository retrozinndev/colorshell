import { Accessor } from "ags";
import { tr } from "../i18n/intl";
import { CustomDialog } from "./CustomDialog";
import { Astal } from "ags/gtk4";


export type AskPopupProps = {
    title?: string | Accessor<string>;
    text: string | Accessor<string>;
    cancelText?: string;
    acceptText?: string;
    onAccept?: () => void;
    onCancel?: () => void;
};

/** 
 * A Popup Widget that asks yes or no to a defined promt. 
 * Runs onAccept() when user accepts, or else onDecline() when
 * user doesn't accept / closes window.
 * This window isn't usually registered in this shell windowing 
 * system.
 */
export function AskPopup(props: AskPopupProps): Astal.Window {
    let accepted: boolean = false;

    return <CustomDialog
      namespace={"ask-popup"}
      widthRequest={400}
      heightRequest={250}
      title={props.title ?? tr("ask_popup.title")}
      text={props.text}
      onFinish={() => !accepted && props.onCancel?.()}
      options={[
        { text: props.cancelText ?? tr("cancel") },
        {
            text: props.acceptText ?? tr("accept"),
            onClick: () => {
                accepted = true;
                props.onAccept?.();
            }
        }
    ]} /> as Astal.Window;
}
