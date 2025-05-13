import { Binding } from "astal";
import { Widget } from "astal/gtk3";
import { tr } from "../i18n/intl";
import { CustomDialog, CustomDialogProps } from "./CustomDialog";


export type AskPopupProps = {
    title?: string | Binding<string | undefined>;
    text: string | Binding<string | undefined>;
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
export function AskPopup(props: AskPopupProps): Widget.Window {
    let accepted: boolean = false;

    const window = CustomDialog({
        namespace: "ask-popup",
        widthRequest: 400,
        heightRequest: 250,
        title: props.title ?? tr("ask_popup.title"),
        text: props.text,
        onFinish: () => !accepted && props.onCancel?.(),
        options: [
            { text: props.cancelText ?? tr("cancel") },
            {
                text: props.acceptText ?? tr("accept"),
                onClick: () => {
                    accepted = true;
                    props.onAccept?.();
                }
            }
        ]
    } as CustomDialogProps);

    return window;
}
