import { createBinding, createComputed, For, With } from "ags";
import { Gdk, Gtk } from "ags/gtk4";
import { variableToBoolean } from "../../../modules/utils";

import GObject from "gi://GObject?version=2.0";
import AstalTray from "gi://AstalTray"
import Gio from "gi://Gio?version=2.0";


const astalTray = AstalTray.get_default();

export const Tray = () => {
    const items = createBinding(astalTray, "items").as(items => items.filter(item => item?.gicon));

    return <Gtk.Box class={"tray"} visible={variableToBoolean(items)} spacing={10}>
        <For each={items}>
            {(item: AstalTray.TrayItem) => <Gtk.Box class={"item"}>
                <With value={createComputed([
                      createBinding(item, "actionGroup"),
                      createBinding(item, "menuModel")
                  ])}>
                    {([actionGroup, menuModel]: [Gio.ActionGroup, Gio.MenuModel]) => {
                        const popover = Gtk.PopoverMenu.new_from_model(menuModel);
                        popover.insert_action_group("dbusmenu", actionGroup);
                        popover.hasArrow = false;
                        
                        return <Gtk.Box class={"item"} tooltipMarkup={
                            createBinding(item, "tooltipMarkup")
                          } tooltipText={
                            createBinding(item, "tooltipText")
                          } $={(self) => {
                              const conns: Map<GObject.Object, number> = new Map();
                              const gestureClick = Gtk.GestureClick.new();
                              gestureClick.set_button(0);

                              self.add_controller(gestureClick);

                              conns.set(gestureClick, gestureClick.connect("released", (gesture, _, x, y) => {
                                  if(gesture.get_current_button() === Gdk.BUTTON_PRIMARY) {
                                      item.activate(x, y);
                                      return;
                                  } 

                                  if(gesture.get_current_button() === Gdk.BUTTON_SECONDARY) {
                                      item.about_to_show();
                                      popover.popup();
                                  }
                              }))
                          }}>
                            <Gtk.Image gicon={createBinding(item, "gicon")} pixelSize={16} />
                            {popover}
                        </Gtk.Box>;
                    }}
                </With>
            </Gtk.Box>}
        </For>
    </Gtk.Box>
}
