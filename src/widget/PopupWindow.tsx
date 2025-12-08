import { Astal, Gdk, Gtk } from "ags/gtk4";
import { BackgroundWindow } from "./BackgroundWindow";
import { Accessor, CCProps, createComputed, createRoot, getScope, Node } from "ags";
import { omitObjectKeys } from "../modules/utils";

import GObject from "ags/gobject";


type PopupWindowSpecificProps = {
    $?: (self: Astal.Window) => void;
    children?: Node;
    /** Stylesheet for the background of the popup-window */
    cssBackgroundWindow?: string;
    class?: string | Accessor<string>;
    actionClosed?: (self: Astal.Window) => void|boolean;
    orientation?: Gtk.Orientation | Accessor<Gtk.Orientation>;
    actionClickedOutside?: (self: Astal.Window) => void;
    actionKeyPressed?: (self: Astal.Window, keyval: number, keycode: number) => void;
};

export type PopupWindowProps = Pick<Partial<CCProps<Astal.Window, Astal.Window.ConstructorProps>>, 
    "monitor"
    | "layer"
    | "exclusivity"
    | "marginLeft"
    | "marginTop"
    | "marginRight"
    | "marginBottom"
    | "cursor"
    | "canFocus"
    | "hasFocus"
    | "tooltipMarkup"
    | "tooltipText"
    | "namespace"
    | "visible"
    | "widthRequest"
    | "heightRequest"
    | "halign"
    | "valign"
    | "anchor"
    | "vexpand"
    | "hexpand"> & PopupWindowSpecificProps;


const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export function PopupWindow(props: PopupWindowProps): GObject.Object {
    props.visible ??= true;
    props.layer ??= Astal.Layer.OVERLAY;
    props.actionClickedOutside ??= (self: Astal.Window) => self.close();

    let clickedInside: boolean = false;

    return <Astal.Window {...omitObjectKeys(props, [
          "actionKeyPressed",
          "actionClickedOutside",
          "cssBackgroundWindow",
          "anchor",
          "halign",
          "valign",
          "namespace",
          "marginTop",
          "widthRequest",
          "heightRequest",
          "visible",
          "marginLeft",
          "marginRight",
          "marginBottom",
          "hexpand",
          "vexpand",
          "orientation",
          "actionClosed",
          "$"
      ])} namespace={props.namespace ?? "popup-window"} class={
          (props.class instanceof Accessor) ? 
              ((props.namespace instanceof Accessor) ?
                   createComputed([props.class, props.namespace], (clss, namespace) =>
                      `popup-window ${clss} ${namespace}`)
               : props.class.as(clss => `popup-window ${clss} ${props.namespace ?? ""}`))
          : `popup-window ${props.class ?? ""} ${props.namespace ?? ""}`
      } keymode={Astal.Keymode.EXCLUSIVE} exclusivity={props.exclusivity ?? Astal.Exclusivity.NORMAL}
      anchor={TOP | LEFT | BOTTOM | RIGHT} visible={false} 
      onCloseRequest={(self) => props.actionClosed?.(self)}
      $={(self) => {
          const scope = getScope();
          const conns: Map<GObject.Object, number> = new Map();
          const gestureClick = Gtk.GestureClick.new();
          const keyController = Gtk.EventControllerKey.new();
          
          self.add_controller(gestureClick);
          self.add_controller(keyController);

          props.cssBackgroundWindow && createRoot((dispose) => 
              <BackgroundWindow monitor={props.monitor ?? 0}
                layer={props.layer} css={props.cssBackgroundWindow} 
                keymode={Astal.Keymode.NONE} attach={self}
                onCloseRequest={() => dispose()}
              />
          );

          props.visible && self.show();

          conns.set(gestureClick, gestureClick.connect("released", () => {
              if(clickedInside) {
                  clickedInside = false;
                  return;
              }

              props.actionClickedOutside!(self);
          }));

          conns.set(keyController, keyController.connect("key-pressed", (_, keyval, keycode) => {
              if(keyval === Gdk.KEY_Escape) {
                  conns.forEach((id, obj) => {
                      obj.disconnect(id);
                  });

                  props.actionClickedOutside!(self);
                  return;
              }

              props.actionKeyPressed?.(self, keyval, keycode);
          }));

          scope.onCleanup(() => conns.forEach((id, obj) => 
                GObject.signal_handler_is_connected(obj, id) && obj.disconnect(id)
          ));

          props.$?.(self);
      }}>
          <Gtk.Box hexpand={false} vexpand={false}>
              <Gtk.Box class={"popup-window-container"} halign={props.halign} 
                valign={props.valign} widthRequest={props.widthRequest} 
                hexpand={props.hexpand} vexpand={props.vexpand}
                orientation={props.orientation}
                heightRequest={props.heightRequest} css={`
                    margin-left: ${props.marginLeft ?? 0}px;
                    margin-right: ${props.marginRight ?? 0}px;
                    margin-top: ${props.marginTop ?? 0}px;
                    margin-bottom: ${props.marginBottom ?? 0}px;
                `} $={(self) => {
                    const conns = new Map<GObject.Object, number>(), 
                        gestureClick = Gtk.GestureClick.new();

                    gestureClick.set_button(0);

                    self.add_controller(gestureClick);
                    conns.set(gestureClick, gestureClick.connect("released", () => 
                        clickedInside = true
                    ));

                    conns.set(self, self.connect("destroy", () => conns.forEach((id, obj) =>
                        obj.disconnect(id))));
                }}>
                  {props.children}
              </Gtk.Box>
          </Gtk.Box>
    </Astal.Window> as Astal.Window;
}

export function getPopupWindowContainer(popupWindow: Astal.Window): Gtk.Box {
    return popupWindow.get_child()!.get_first_child() as Gtk.Box;
}
