import { Gtk, Widget } from "astal/gtk3";
import { TileNetwork } from "./tiles/Network";
import { TileBluetooth } from "./tiles/Bluetooth";
import { TileDND } from "./tiles/DoNotDisturb";
import { TileRecording } from "./tiles/Recording";
import { TileNightLight } from "./tiles/NightLight";
import { Pages } from "./Pages";
import { GObject } from "astal";

export const tileList: Array<() => Gtk.Widget> = [
    TileNetwork,
    TileBluetooth,
    TileRecording,
    TileDND,
    TileNightLight
];

export let TilesPages: (Pages|null) = null;

export function Tiles(): Gtk.Widget {
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

    tileList.map((item: (() => Gtk.Widget)) => {
        const tile = item();
        tilesFlowBox.insert(tile, -1);

        const children = tilesFlowBox.get_children();
        children[children.length-1]!.set_can_focus(false);
        const binding: GObject.Binding = tile.bind_property("visible", 
            children[children.length-1], "visible", 
            GObject.BindingFlags.SYNC_CREATE);

        const destroyId: number = tile.connect("destroy-event", (self: typeof tile) => {
            binding.unbind();
            self.disconnect(destroyId);
        });
    });

    return new Widget.Box({
        className: "tiles-container",
        orientation: Gtk.Orientation.VERTICAL,
        onDestroy: () => TilesPages = null,
        setup: (box) => {
            if(!TilesPages) TilesPages = new Pages({
                className: "tile-pages"
            });

            box.set_children([
                tilesFlowBox,
                TilesPages!
            ]);
        }
    } as Widget.BoxProps);
}
