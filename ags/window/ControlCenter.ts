import { Astal, Gtk, Widget } from "astal/gtk3";
import { QuickActions } from "../widget/control-center/QuickActions";
import { Tiles } from "../widget/control-center/Tiles";
import { Sliders } from "../widget/control-center/Sliders";
import { hidePages, PagesWidget } from "../widget/control-center/Pages";
import { NotifHistory } from "../widget/control-center/NotifHistory";
import { PopupWindow } from "../widget/PopupWindow";


export const ControlCenter = (mon: number) => PopupWindow({
    namespace: "control-center",
    className: "control-center",
    exclusivity: Astal.Exclusivity.NORMAL,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT | Astal.WindowAnchor.BOTTOM,
    layer: Astal.Layer.OVERLAY,
    focusOnMap: true,
    marginTop: 10,
    marginRight: 10,
    monitor: mon,
    onDestroy: () => hidePages(),
    widthRequest: 420,
    child: new Widget.Box({
        className: "popup",
        halign: Gtk.Align.END,
        onButtonPressEvent: () => true,
        orientation: Gtk.Orientation.VERTICAL,
        children: [
            new Widget.Box({
                className: "control-center-container",
                orientation: Gtk.Orientation.VERTICAL,
                vexpand: false,
                children: [
                    QuickActions(), 
                    Sliders(),
                    Tiles(),
                    PagesWidget()
                ]
            } as Widget.BoxProps),
            NotifHistory()
        ]
    } as Widget.BoxProps)
} as Widget.WindowProps);
