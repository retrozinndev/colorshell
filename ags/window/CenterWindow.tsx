import { Astal, Gtk } from "ags/gtk4";

import { Separator } from "../widget/Separator";
import { PopupWindow } from "../widget/PopupWindow";
import { BigMedia } from "../widget/center-window/BigMedia";
import { time } from "../scripts/utils";
import { player } from "../widget/bar/Media";

export const CenterWindow = (mon: number) => 
    <PopupWindow namespace={"center-window"} marginTop={10} halign={Gtk.Align.CENTER} 
      valign={Gtk.Align.START} monitor={mon}>
      
        <Gtk.Box class={"center-window-container"} spacing={6}>
            <Gtk.Box class={"left"} orientation={Gtk.Orientation.VERTICAL}>
                <Gtk.Box class={"datetime"} orientation={Gtk.Orientation.VERTICAL}
                  halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} 
                  vexpand={true}>

                    <Gtk.Label class={"time"} label={time(t => t.format("%H:%M")!)} />
                    <Gtk.Label class={"date"} label={time(d => d.format("%A, %B %d")!)} />
                </Gtk.Box>
                <Gtk.Box class={"calendar-box"} hexpand={true} valign={Gtk.Align.START}>
                    <Gtk.Calendar showHeading={true} showDayNames={true} 
                      showWeekNumbers={false} 
                    />
                </Gtk.Box>
            </Gtk.Box>

            <Separator orientation={Gtk.Orientation.HORIZONTAL} cssColor="gray"
              margin={5} spacing={8} alpha={.3} visible={player(pl => pl.available)}
            />
            <BigMedia />
        </Gtk.Box>
    </PopupWindow> as Astal.Window;
