import { Binding } from "astal";
import { Widget } from "astal/gtk3";
import { tr } from "../i18n/intl";
import { CustomDialog, CustomDialogProps } from "./CustomDialog";

export type EntryPopupProps = {
    title: string | Binding<string>;
    text?: string | Binding<string>;
    cancelText?: string | Binding<string>;
    acceptText?: string | Binding<string>;
    closeOnAccept?: boolean;
    entryPlaceholder?: string | Binding<string>;
    onAccept: (userInput: string) => void;
    onCancel?: () => void;
    onFinish?: () => void;
    isPassword?: boolean | Binding<string>;
};

export function EntryPopup(props: EntryPopupProps): Widget.Window {
    props.closeOnAccept = props.closeOnAccept ?? true;

    const entry = new Widget.Entry({
        className: props.isPassword && "password",
        visibility: (props.isPassword instanceof Binding) ? 
            props.isPassword.as(isPasswd => !isPasswd) 
        : !props.isPassword,
        invisibleChar: 0x00B7, // set '·' as the invisible char
        xalign: .5,
        placeholderText: props.entryPlaceholder,
        onActivate: (self) => {
            props.closeOnAccept && window.close();
            entered = true;
            props.onAccept(self.text);
            self.text = "";
        },
    } as Widget.EntryProps);

    let entered: boolean = false;

    const window = CustomDialog({
        namespace: "entry-popup",
        widthRequest: 420,
        heightRequest: 220,
        title: props.title,
        text: props.text,
        child: entry,
        options: [
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
        ],
        onFinish: () => {
            !entered && props.onCancel?.()
            props.onFinish?.();
        }
    } as CustomDialogProps);

    return window;
} 
