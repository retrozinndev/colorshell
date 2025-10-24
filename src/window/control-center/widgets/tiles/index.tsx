import { Gtk } from "ags/gtk4";
import { TileNetwork } from "./Network";
import { TileBluetooth } from "./Bluetooth";
import { TileDND } from "./DoNotDisturb";
import { TileRecording } from "./Recording";
import { TileNightLight } from "./NightLight";
import { Pages } from "../pages";
import { createRoot, getScope } from "ags";


export let TilesPages: Pages|undefined;
export const tileList: Array<() => JSX.Element|Gtk.Widget> = [
    TileNetwork,
    TileBluetooth,
    TileRecording,
    TileDND,
    TileNightLight
] as Array<() => Gtk.Widget>;

export function Tiles(): Gtk.Widget {
    return createRoot((dispose) => {
        getScope().onCleanup(() => TilesPages = undefined);

        return <Gtk.Box class={"tiles-container"} orientation={Gtk.Orientation.VERTICAL}
          onDestroy={() => dispose()}>

            <Gtk.FlowBox orientation={Gtk.Orientation.HORIZONTAL} rowSpacing={6}
              columnSpacing={6} minChildrenPerLine={2} activateOnSingleClick
              maxChildrenPerLine={2} hexpand homogeneous>

                {tileList.map(t => t())}
            </Gtk.FlowBox>

            <Pages class={"tile-pages"} $={(self) => TilesPages = self} />
        </Gtk.Box> as Gtk.Box;
    });
}
