import { Gtk, Widget } from "astal/gtk3";
import { QuickActions } from "../widget/control-center/QuickActions";
import { Tiles } from "../widget/control-center/Tiles";
import { Sliders } from "../widget/control-center/Sliders";
import { PopupWindow, PopupWindowProps } from "../widget/PopupWindow";
import { hidePages, PagesWidget } from "../widget/control-center/Pages";
import { NotifHistory } from "../widget/control-center/NotifHistory";

const connections: Array<number> = [];

export const ControlCenter: Widget.Window = PopupWindow({
    className: "control-center",
    namespace: "control-center",
    marginTop: 10,
    marginRight: 10,
    monitor: 0,
    onClose: () => hidePages(),
    halign: Gtk.Align.END,
    valign: Gtk.Align.START,
    visible: false,
    vexpand: true,
    child: new Widget.Box({
        orientation: Gtk.Orientation.VERTICAL,
        expand: true,
        vexpand: true,
        children: [
            new Widget.Box({
                className: "control-center-container",
                orientation: Gtk.Orientation.VERTICAL,
                widthRequest: 400,
                vexpand: false,
                hexpand: true,
                children: [
                    QuickActions, 
                    Sliders,
                    Tiles,
                    PagesWidget
                ]
            } as Widget.BoxProps),
            NotifHistory
        ]
    } as Widget.BoxProps)
} as PopupWindowProps);

connections.push(ControlCenter.connect("hide", (_) => {
    hidePages();
}));
