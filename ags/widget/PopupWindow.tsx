import { Astal, Gdk, Gtk } from "ags/gtk4";
import { BackgroundWindow } from "./BackgroundWindow";
import { Accessor, CCProps, createComputed } from "ags";
import { omitObjectKeys, WidgetNodeType } from "../scripts/utils";

import GObject from "ags/gobject";


type PopupWindowSpecificProps = {
    $?: (self: Astal.Window) => void;
    children?: WidgetNodeType;
    onDestroy?: (self: Astal.Window) => void;
    /** Stylesheet for the background of the popup-window */
    cssBackgroundWindow?: string;
    class?: string | Accessor<string>;
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
    | "namespace"
    | "widthRequest"
    | "heightRequest"
    | "halign"
    | "valign"
    | "vexpand"
    | "hexpand"> & PopupWindowSpecificProps;

const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;

export function PopupWindow(props: PopupWindowProps): GObject.Object {
    props.layer ??= Astal.Layer.OVERLAY;

    const bgWindow = props.cssBackgroundWindow ? (<BackgroundWindow
        monitor={props.monitor ?? 0}
        layer={props.layer}
        css={props.cssBackgroundWindow} /> as Astal.Window)
    : undefined;
    
    const omittedProps = omitObjectKeys(props, [
        "children",
        "actionKeyPressed",
        "actionClickedOutside",
        "cssBackgroundWindow",
        "marginTop",
        "marginLeft",
        "marginRight",
        "marginBottom"
    ]);

    return <Astal.Window {...omittedProps} visible
      namespace={props.namespace ?? "popup-window"} class={
          (props.class instanceof Accessor) ? 
              ((props.namespace instanceof Accessor) ?
                   createComputed([props.class, props.namespace], (clss, namespace) =>
                      `popup-window ${clss} ${namespace}`)
               : props.class.as(clss => `popup-window ${clss} ${props.namespace ?? ""}`))
          : `popup-window ${props.class ?? ""} ${props.namespace ?? ""}`
      } keymode={Astal.Keymode.EXCLUSIVE} anchor={TOP | LEFT | RIGHT | BOTTOM}
      exclusivity={props.exclusivity ?? Astal.Exclusivity.NORMAL}
      onDestroy={(self) => {
          bgWindow?.close();
          props.onDestroy?.(self);
      }}
      $={(self) => {
          props.actionClickedOutside ??= (_: Astal.Window) => self.close();

          const conns: Map<GObject.Object, number> = new Map();
          const gestureClick = Gtk.GestureClick.new();
          const keyController = Gtk.EventControllerKey.new();
          const allocation = (self.get_child()! as Gtk.Box).get_first_child()!.get_allocation();
          
          self.add_controller(gestureClick);
          self.add_controller(keyController);

          conns.set(gestureClick, gestureClick.connect("released", (_, __, x, y) => {
              if((x < allocation.x || x > (allocation.x + allocation.width)) ||
                 (y < allocation.y || y > (allocation.y + allocation.height))) {

                  // Disconnect signals because window is being closed
                  conns.forEach((id, obj) => {
                      obj.disconnect(id);
                  });

                  props.actionClickedOutside!(self);
              }
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

          conns.set(self, self.connect("destroy", () => conns.forEach((id, obj) =>
              obj.disconnect(id))));

          props.$?.(self);
      }}>
          <Gtk.Box halign={props.halign} valign={props.valign} hexpand vexpand css={`box {
                margin-left: ${props.marginLeft ?? 0}px;
                margin-right: ${props.marginRight ?? 0}px;
                margin-top: ${props.marginTop ?? 0}px;
                margin-bottom: ${props.marginBottom ?? 0}px;
            }`
          }>
          
              <Gtk.Box widthRequest={props.widthRequest} heightRequest={props.heightRequest}
                $={(self) => {
                    const gestureClick = Gtk.GestureClick.new();
                    self.add_controller(gestureClick);

                    const clickConn = gestureClick.connect("released", () => true);
                    const destroyConn = self.connect("destroy", () => {
                        gestureClick.disconnect(clickConn);
                        self.disconnect(destroyConn);
                    });
                }}>
                  {props.children}
              </Gtk.Box>
          </Gtk.Box>
    </Astal.Window>;
}
