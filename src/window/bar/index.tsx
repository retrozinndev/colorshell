import { Astal, Gtk } from "ags/gtk4";
import { Tray } from "./widgets/Tray";
import { Workspaces } from "./widgets/Workspaces";
import { FocusedClient } from "./widgets/FocusedClient";
import { Apps } from "./widgets/Apps";
import { Clock } from "./widgets/Clock";
import { Status } from "./widgets/Status";
import { Media } from "./widgets/Media";
import Windows from "..";


export const Bar = Windows.forMonitors((mon) => {
    const widgetSpacing = 4;

    return <Astal.Window namespace={"top-bar"} layer={Astal.Layer.TOP}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
      exclusivity={Astal.Exclusivity.EXCLUSIVE} heightRequest={46} monitor={mon} 
      canFocus={false}>

        <Gtk.Box class={"bar-container"}>
            <Gtk.CenterBox class={"bar-centerbox"} hexpand>
                <Gtk.Box class={"widgets-left"}
                  halign={Gtk.Align.START} spacing={widgetSpacing}
                  $type="start">

                    <Apps />
                    <Workspaces />
                    <FocusedClient />
                </Gtk.Box>
                <Gtk.Box class={"widgets-center"}
                  spacing={widgetSpacing} halign={Gtk.Align.CENTER}
                  $type="center">

                    <Clock />
                    <Media />
                </Gtk.Box>
                <Gtk.Box class={"widgets-right"}
                  spacing={widgetSpacing} halign={Gtk.Align.END}
                  $type="end">
                    <Tray />
                    <Status />
                </Gtk.Box>
            </Gtk.CenterBox>
        </Gtk.Box>
    </Astal.Window>
});
