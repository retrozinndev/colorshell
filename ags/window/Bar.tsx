import { Astal, Gtk } from "ags/gtk4";

import { Tray } from "../widget/bar/Tray";
import { Workspaces } from "../widget/bar/Workspaces";
import { FocusedClient } from "../widget/bar/FocusedClient";
import { Media } from "../widget/bar/Media";
import { Apps } from "../widget/bar/Apps";
import { Clock } from "../widget/bar/Clock";
import { Status } from "../widget/bar/Status";

export const Bar = (mon: number) => {
    const widgetSpacing = 4;
    return <Astal.Window 
        namespace={"top-bar"}
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
        layer={Astal.Layer.TOP}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        heightRequest={46}
        monitor={mon}
        visible={true}
        canFocus={false}>
            <Gtk.Box class={"bar-container"}>
            <Gtk.CenterBox class={"bar-centerbox"}>
                <Gtk.Box class={"widgets-left"} homogeneous={false}
                         halign={Gtk.Align.START} spacing={widgetSpacing}>

                    <Apps />
                    <Workspaces />
                    <FocusedClient />
                </Gtk.Box>
                <Gtk.Box class={"widgets-center"} homogeneous={false}
                         spacing={widgetSpacing} halign={Gtk.Align.CENTER}>

                    <Clock />
                    <Media />
                </Gtk.Box>
                <Gtk.Box class={"widgets-right"} homogeneous={false}
                         spacing={widgetSpacing} halign={Gtk.Align.END}>
                    <Tray />
                    <Status />
                </Gtk.Box>
            </Gtk.CenterBox>
        </Gtk.Box>
    </Astal.Window>
}
