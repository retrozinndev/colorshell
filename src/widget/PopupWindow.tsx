import { Astal, Gdk, Gtk } from "ags/gtk4";
import { BackgroundWindow } from "./BackgroundWindow";
import { Accessor, createBinding, createComputed, createRoot, getScope } from "ags";
import { omitObjectKeys } from "../modules/utils";
import GObject, { gtype, property, register, signal } from "ags/gobject";


@register({ GTypeName: "ClshPopupWindow" })
export class PopupWindow extends Astal.Window {
    declare $signals: PopupWindow.SignalSignatures;

    #bg: Astal.Window;

    @signal()
    closed() {}

    @signal()
    clickedOutside() {
        if(!this.closeOnClickOutside)
            return;

        this.close();
    }

    @signal()
    keyPressed(_: number, __: number) {}

    @property(Boolean)
    closeOnClickOutside: boolean = true;

    @property(gtype<string|null>(String))
    backgroundCss: string|null = null;

    constructor(props: Partial<PopupWindow.ConstructorProps>) {
        super({
            cssName: "popupwindow",
            layer: Astal.Layer.OVERLAY,
            exclusivity: Astal.Exclusivity.NORMAL,
            ...omitObjectKeys(props, [
                "backgroundCss",
                "closeOnClickOutside"
            ])
        });

        if(props.backgroundCss !== undefined)
            this.backgroundCss = props.backgroundCss;

        if(props.closeOnClickOutside !== undefined)
            this.closeOnClickOutside = props.closeOnClickOutside;

        this.#bg = BackgroundWindow({
            css: createBinding(this, "backgroundCss")(css => css ?? ""),
            monitor: createBinding(this, "monitor"),
            layer: createBinding(this, "layer"),
            keymode: Astal.Keymode.NONE,
            attach: this,
            
        });
        this.#bg.hide();

        this.conns.set(gestureClick, gestureClick.connect("released", () => {
            if(clickedInside) {
                clickedInside = false;
                return;
            }

            props.actionClickedOutside!(self);
        }));

        this.conns.set(keyController, keyController.connect("key-pressed", (_, keyval, keycode) => {
            if(keyval === Gdk.KEY_Escape) {

                this.emit("clicked-outside");
                return;
            }

            this.emit("key-pressed", keyval, keycode);
        }));
    }

    hide(): void {
        this.#bg.hide();
        super.hide();
    }

    show(): void {
        if(this.#bg.is_visible())
            this.#bg.hide();

        this.#bg.show();
        super.show();
    }

    close(): void {
        super.close();
        this.emit("closed");
    }
}

export namespace PopupWindow {
    export interface ConstructorProps extends Omit<
        Astal.Window.ConstructorProps,
        "anchor"
    > {
        backgroundCss: string;
        closeOnClickOutside: boolean;
    };

    export interface SignalSignatures extends Astal.Window.SignalSignatures {
        "closed": () => void;
        "clicked-outside": () => void;
        "key-pressed": (keyval: number, keycode: number) => void;
    }
}

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
