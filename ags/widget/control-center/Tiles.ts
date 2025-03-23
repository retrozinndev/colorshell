import { Gtk, Widget } from "astal/gtk3";
import { TileNetwork } from "./tiles/Network";
import { TileBluetooth } from "./tiles/Bluetooth";
import { TileDND } from "./tiles/DoNotDisturb";

export const tileList: Array<any> = [
    TileNetwork,
    TileBluetooth,
    TileDND
];

export function TilesWidget(): Gtk.Widget {
    const tilesFlowBox: Gtk.FlowBox = new Gtk.FlowBox({
        visible: true,
        orientation: Gtk.Orientation.HORIZONTAL,
        rowSpacing: 6,
        columnSpacing: 6,
        minChildrenPerLine: 2,
        maxChildrenPerLine: 2,
        expand: true,
        homogeneous: true,
    } as Gtk.FlowBox.ConstructorProps);

    tileList.map((item: Gtk.Widget) => 
        tilesFlowBox.insert(item, -1));

    return new Widget.Box({
        className: "tiles-container",
        child: tilesFlowBox
    } as Widget.BoxProps);
}

export const Tiles: Gtk.Widget = TilesWidget();
