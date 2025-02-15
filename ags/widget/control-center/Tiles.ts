import { Gtk, Widget } from "astal/gtk3";

export const tileList: Array<Gtk.Widget> = [];

export function TilesWidget(): Gtk.Widget {
    const tilesFlowBox: Gtk.FlowBox = new Gtk.FlowBox({
        visible: true,
        noShowAll: false,
        orientation: Gtk.Orientation.HORIZONTAL
    } as Gtk.Grid.ConstructorProps);

    tileList.map((item: Gtk.Widget) =>
        tilesFlowBox.insert(item, -1));

    return new Widget.Box({
        children: [
            tilesFlowBox
        ]
    } as Widget.BoxProps);
}

export const Tiles: Gtk.Widget = TilesWidget();
