import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { QuickActions } from "../widget/control-center/QuickActions";
import { Tiles } from "../widget/control-center/Tiles";
import { Sliders } from "../widget/control-center/Sliders";
import { hidePages, PagesWidget } from "../widget/control-center/Pages";
import { NotifHistory } from "../widget/control-center/NotifHistory";
import { Windows } from "../windows";

const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor;

export const ControlCenter = (mon: number) => new Widget.Window({
    namespace: "control-center",
    className: "control-center",
    anchor: TOP | BOTTOM | LEFT | RIGHT,
    exclusivity: Astal.Exclusivity.NORMAL,
    keymode: Astal.Keymode.EXCLUSIVE,
    layer: Astal.Layer.OVERLAY,
    focusOnMap: true,
    monitor: mon,
    onDestroy: () => {
        hidePages();
    },
    onButtonPressEvent: (_, event: Gdk.Event) => {
        const [, posX, posY] = event.get_coords();
        const childAllocation = _.get_child()!.get_allocation();

        if((posX < childAllocation.x || posX > (childAllocation.x + childAllocation.width)) || 
           (posY < childAllocation.y || posY > (childAllocation.y + childAllocation.height))) {
            Windows.close("control-center");
            hidePages();
        }
    },
    onKeyPressEvent: (_, event: Gdk.Event) => {
        if(event.get_keyval()[1] === Gdk.KEY_Escape) {
            Windows.close("control-center");
            hidePages();
        }
    },
    child: new Widget.Box({
        className: "popup",
        halign: Gtk.Align.END,
        css: `margin-top: 10px;
              margin-right: 10px;
              margin-bottom: 10px;`,
        widthRequest: 400,
        onButtonPressEvent: () => true,
        orientation: Gtk.Orientation.VERTICAL,
        children: [
            new Widget.Box({
                className: "control-center-container",
                orientation: Gtk.Orientation.VERTICAL,
                widthRequest: 400,
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
