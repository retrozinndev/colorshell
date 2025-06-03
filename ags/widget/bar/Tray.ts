import { bind, Gio, Variable } from "astal";
import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import AstalTray from "gi://AstalTray"

const astalTray = AstalTray.get_default();

function menuFromModel(model: Gio.MenuModel, actionGroup: Gio.ActionGroup | null): Gtk.Menu {
    const menu = Gtk.Menu.new_from_model(model);
    menu.insert_action_group("dbusmenu", actionGroup)

    return menu;
}

export function Tray(): Gtk.Widget {
    return new Widget.Box({
        className: "tray",
        visible: bind(astalTray, "items").as((items: Array<AstalTray.TrayItem>) => items.length > 0),
        children: bind(astalTray, "items").as((items: Array<AstalTray.TrayItem>) => items
            .filter(item => item?.gicon)
            .map((item: AstalTray.TrayItem) => 
                new Widget.Box({
                    className: "item",
                    child: Variable.derive(
                        [ bind(item, "menuModel"), bind(item, "actionGroup") ],
                        (menuModel: Gio.MenuModel, actionGroup: Gio.ActionGroup) => {
                            const menu = menuFromModel(menuModel, actionGroup);

                            return new Widget.Button({
                                className: "item-button",
                                tooltipMarkup: bind(item, "tooltipMarkup"),
                                onClick: (_, event: Astal.ClickEvent) => {
                                    if(event.button === Astal.MouseButton.SECONDARY) {
                                        item.about_to_show();
                                        menu.popup_at_widget(_, Gdk.Gravity.NORTH, Gdk.Gravity.SOUTH_WEST, null);
                                    } else if(event.button === Astal.MouseButton.PRIMARY) 
                                        item.activate(event.x, event.y);
                                },
                                halign: Gtk.Align.CENTER,
                                child: new Widget.Icon({
                                    gIcon: bind(item, "gicon")
                                })
                            } as Widget.ButtonProps)
                        }
                    )()
                } as Widget.BoxProps)
            )
        )
    } as Widget.BoxProps);
}
