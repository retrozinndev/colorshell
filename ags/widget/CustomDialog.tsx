import { Astal, Gtk } from "ags/gtk4";
import { Windows } from "../windows";
import { PopupWindow } from "./PopupWindow";
import { Separator } from "./Separator";
import { tr } from "../i18n/intl";
import { Accessor, For, With } from "ags";
import { variableToBoolean, WidgetNodeType } from "../scripts/utils";


export type CustomDialogProps = {
    namespace?: string | Accessor<string>;
    className?: string | Accessor<string>;
    cssBackground?: string;
    title?: string | Accessor<string>;
    text?: string | Accessor<string>;
    heightRequest?: number | Accessor<number>;
    widthRequest?: number | Accessor<number>;
    childOrientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
    children?: WidgetNodeType;
    onFinish?: () => void;
    options?: Array<CustomDialogOption> | Accessor<Array<CustomDialogOption>>;
    optionsOrientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
};

export interface CustomDialogOption {
    onClick?: () => void;
    text: string | Accessor<string>;
    closeOnClick?: boolean | Accessor<boolean>;
}

function CustomDialogOption(props: CustomDialogOption & { dialog: Astal.Window }) {
    function onClicked() {
        props.onClick?.();
        props.closeOnClick && props.dialog.close();
    }

    return <Gtk.Button class="option" hexpand={true} label={props.text} 
      onClicked={onClicked} onActivate={onClicked}/>
}

export function CustomDialog({ options = [{ text: tr("accept") }], ...props}: CustomDialogProps) {
    let dialog: Astal.Window;
    return Windows.getDefault().createWindowForFocusedMonitor((mon: number) => 
    <PopupWindow namespace={props.namespace ?? "custom-dialog"} monitor={mon}
          cssBackgroundWindow={props.cssBackground ?? "background: rgba(0, 0, 0, .3);"}
          exclusivity={Astal.Exclusivity.IGNORE} layer={Astal.Layer.OVERLAY}
          halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}
          widthRequest={props.widthRequest ?? 400} heightRequest={props.heightRequest ?? 220}
          onDestroy={props.onFinish} $={(self) => dialog = self}>
        
          <Gtk.Box class={props.className ?? "custom-dialog-container"}
            orientation={Gtk.Orientation.VERTICAL}>
              <Gtk.Label class={"title"} visible={variableToBoolean(props.title)} label={props.title} />
              <Gtk.Label class={"text"} visible={variableToBoolean(props.text)} label={props.text} />
              <Gtk.Box class={"custom-children custom-child"} visible={variableToBoolean(props.children)}
                orientation={props.childOrientation ?? Gtk.Orientation.VERTICAL}>

              {
                (props.children instanceof Accessor) ?
                  (Array.isArray(props.children) ?
                    <For each={props.children! as Accessor<Array<JSX.Element>>}>
                        {(widget) => widget && widget}
                    </For>
                  : <With value={props.children as Accessor<JSX.Element>}>
                        {(widget) => widget && widget}
                    </With>)
                : (Array.isArray(props.children) ? 
                    props.children.map(widget => widget && widget).filter(w => w)
                  : props.children)
              }
              </Gtk.Box>
              <Separator alpha={.2} visible={options && options.length > 0}
                spacing={8} orientation={Gtk.Orientation.VERTICAL} />

              {(<Gtk.Box class={"options"} orientation={props.optionsOrientation ?? Gtk.Orientation.HORIZONTAL}
                hexpand={true} heightRequest={38} homogeneous={true}>
                {
                  (options instanceof Accessor) ? 
                    <For each={options}>
                        {(option) => <CustomDialogOption {...option} dialog={dialog} />}
                    </For>
                  : options.map(option => 
                      <CustomDialogOption {...option} dialog={dialog} />)
                }
            </Gtk.Box>)}
        </Gtk.Box>
    </PopupWindow>)();
}
