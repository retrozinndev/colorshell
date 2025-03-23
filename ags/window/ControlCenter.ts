import { Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { QuickActions } from "../widget/control-center/QuickActions";
import { Tiles } from "../widget/control-center/Tiles";
import { Sliders } from "../widget/control-center/Sliders";
import { hidePages, PagesWidget } from "../widget/control-center/Pages";
import { NotifHistory } from "../widget/control-center/NotifHistory";

const connections: Array<number> = [];
const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor;

export const ControlCenter = new Widget.Window({
    namespace: "control-center",
    className: "control-center",
    anchor: TOP | BOTTOM | LEFT | RIGHT,
    exclusivity: Astal.Exclusivity.NORMAL,
    keymode: Astal.Keymode.EXCLUSIVE,
    layer: Astal.Layer.OVERLAY,
    focusOnMap: true,
    visible: false,
    monitor: 0,
    onDestroy: (_) => connections.map(id => _.disconnect(id)),
    onButtonPressEvent: (_, event: Gdk.Event) => {
        const [, posX, posY] = event.get_coords();
        const childAllocation = _.get_child()!.get_allocation();

        if((posX < childAllocation.x || posX > (childAllocation.x + childAllocation.width)) || 
           (posY < childAllocation.y || posY > (childAllocation.y + childAllocation.height))) {
            _.hide();
            hidePages();
        }
    },
    onKeyPressEvent: (_, event: Gdk.Event) => {
        if(event.get_keyval()[1] === Gdk.KEY_Escape) {
            _.hide();
            hidePages();
        }
    },
    child: new Widget.Box({
        className: "popup",
        halign: Gtk.Align.END,
        css: `.popup {
            margin-top: 10px;
            margin-right: 10px;
            margin-bottom: 10px;
        }`,
        vexpand: true,
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
                    QuickActions, 
                    Sliders,
                    Tiles,
                    PagesWidget
                ]
            } as Widget.BoxProps),
            NotifHistory
        ]
    } as Widget.BoxProps)
} as Widget.WindowProps);

connections.push(ControlCenter.connect("hide", (_) => {
    hidePages();
}));
