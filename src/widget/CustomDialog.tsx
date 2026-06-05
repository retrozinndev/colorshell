import { Astal, Gtk } from "ags/gtk4";
import { PopupWindow } from "./PopupWindow";
import { Separator } from "./Separator";
import { Accessor, Node } from "ags";
import { transformWidget, variableToBoolean } from "../modules/utils";
import Windows from "../window";


export type CustomDialogProps = {
    namespace?: string | Accessor<string>;
    className?: string | Accessor<string>;
    cssBackground?: string;
    title?: string | Accessor<string>;
    text?: string | Accessor<string>;
    heightRequest?: number | Accessor<number>;
    widthRequest?: number | Accessor<number>;
    childOrientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
    children?: Node;
    onFinish?: () => void;
    options?: Array<CustomDialogOption> | Accessor<Array<CustomDialogOption>>;
    optionsOrientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
};

export interface CustomDialogOption {
    onClick?: () => void;
    text: string | Accessor<string>;
    closeOnClick?: boolean | Accessor<boolean>;
}

function CustomDialogOption({closeOnClick = true, ...props}: CustomDialogOption & {
    dialog: Astal.Window;
}) {
    return <Gtk.Button class="option reactive-primary" hexpand label={props.text} 
      onClicked={() => {
          props.onClick?.();
          closeOnClick && 
              props.dialog?.close();
      }} 
    />
}

export function CustomDialog({ options = [{ text: tr("accept") }], ...props}: CustomDialogProps) {
    return Windows.forFocusedMonitor((mon) => {
        const container = <Gtk.Box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} 
          widthRequest={props.widthRequest ?? 400} heightRequest={props.heightRequest ?? 220}
          orientation={Gtk.Orientation.VERTICAL} class={"container"}>

            <Gtk.Label class={"title"} visible={variableToBoolean(props.title)} label={props.title} />
            <Gtk.Label class={"text"} visible={variableToBoolean(props.text)} label={props.text} 
              vexpand valign={Gtk.Align.START} />
            <Gtk.Box class={"custom-children custom-child"} visible={variableToBoolean(props.children)}
              orientation={props.childOrientation ?? Gtk.Orientation.VERTICAL}>
                {transformWidget(props.children, (child) => child as JSX.Element)}
            </Gtk.Box>
            <Separator alpha={.2} visible={options && options.length > 0}
              spacing={8} orientation={Gtk.Orientation.VERTICAL}
            />
        </Gtk.Box> as Gtk.Box;

        const popup = <PopupWindow namespace={props.namespace ?? "custom-dialog"} monitor={mon}
          cssName={"customdialog"} backgroundCss={props.cssBackground ?? "background: rgba(0, 0, 0, .3);"}
          exclusivity={Astal.Exclusivity.IGNORE} layer={Astal.Layer.OVERLAY}
          onClosed={() => props.onFinish?.()}>

            {container}
        </PopupWindow> as PopupWindow;

        container.append(
            <Gtk.Box class={"options"} orientation={props.optionsOrientation ?? Gtk.Orientation.HORIZONTAL}
              hexpand={true} heightRequest={38} homogeneous={true}>

                {transformWidget(options, (props) => <CustomDialogOption {...props} dialog={popup} />)}
            </Gtk.Box> as Gtk.Box
        );

        popup.show();

        return popup;
    })();
}

export function getContainerCustomDialog(dialog: Astal.Window): Gtk.Box {
    return dialog.get_first_child()?.get_last_child()?.get_prev_sibling() as Gtk.Box;
}
