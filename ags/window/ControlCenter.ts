import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { QuickActions } from "../widget/control-center/QuickActions";
import { Tiles } from "../widget/control-center/Tiles";

const widgetsContainer: Widget.Box = new Widget.Box({
    className: "control-center-container",
    orientation: Gtk.Orientation.VERTICAL,
} as Widget.BoxProps, 
QuickActions, 
Tiles);

export const ControlCenter: Widget.Window = new Widget.Window({
    className: "control-center",
    namespace: "control-center",
    canFocus: true,
    exclusivity: Astal.Exclusivity.NORMAL,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT,
    margin_top: 10,
    margin_right: 10,
    width_request: 450,
    height_request: 400,
    monitor: 0,
    visible: false
} as Widget.WindowProps, widgetsContainer);
