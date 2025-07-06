import { Gtk } from "ags/gtk4";
import { TileNetwork } from "./tiles/Network";
import { TileBluetooth } from "./tiles/Bluetooth";
import { TileDND } from "./tiles/DoNotDisturb";
import { TileRecording } from "./tiles/Recording";
import { TileNightLight } from "./tiles/NightLight";
import { Pages } from "./Pages";


export let TilesPages: (Pages|null) = null;
export const tileList: Array<() => Gtk.Widget> = [
    TileNetwork,
    TileBluetooth,
    TileRecording,
    TileDND,
    TileNightLight
];

export function Tiles(): Gtk.Widget {
    return <Gtk.Box class={"tiles-container"} orientation={Gtk.Orientation.VERTICAL}
      onDestroy={() => TilesPages = null} $={(self) => {
          if(!TilesPages)
              TilesPages = <Pages class="tile-pages" /> as Pages;

          self.append(TilesPages as unknown as Gtk.Widget);
      }}>

        <Gtk.FlowBox orientation={Gtk.Orientation.HORIZONTAL} rowSpacing={6}
          columnSpacing={6} minChildrenPerLine={2} activateOnSingleClick={true}
          maxChildrenPerLine={2} hexpand={true} vexpand={true} homogeneous={true}>

            {tileList.map(tile => tile())}
        </Gtk.FlowBox>
    </Gtk.Box> as Gtk.Box;
}
