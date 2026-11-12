import { Gtk } from "ags/gtk4";
import { TileNetwork } from "./Network";
import { TileBluetooth } from "./Bluetooth";
import { TileDND } from "./DoNotDisturb";
import { TileRecording } from "./Recording";
import { TileNightLight } from "./NightLight";
import { createRoot } from "ags";
import type Pages from "../pages";
import ControlCenterWindow from "../..";


export const tileList: Array<(pages: Pages) => JSX.Element|Gtk.Widget> = [
    TileNetwork,
    TileBluetooth,
    TileRecording,
    TileDND,
    TileNightLight
] as Array<() => Gtk.Widget>;

export function Tiles({ccWindow}: { ccWindow: ControlCenterWindow }): Gtk.Widget {
    return createRoot((dispose) => {
        return <Gtk.Box class={"tiles-container"} orientation={Gtk.Orientation.VERTICAL}
          onDestroy={() => dispose()}>

            <Gtk.FlowBox orientation={Gtk.Orientation.HORIZONTAL} rowSpacing={6}
              columnSpacing={6} minChildrenPerLine={2} activateOnSingleClick
              maxChildrenPerLine={2} hexpand homogeneous>

                {tileList.map(t => t(ccWindow.pages))}
            </Gtk.FlowBox>
        </Gtk.Box> as Gtk.Box;
    });
}
