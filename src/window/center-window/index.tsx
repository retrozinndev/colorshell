import { Gdk, Gtk } from "ags/gtk4";
import { Separator } from "../../widget/Separator";
import { PopupWindow } from "../../widget/PopupWindow";
import { BigMedia } from "./widgets/BigMedia";
import { time, variableToBoolean } from "../../modules/utils";
import { createBinding } from "ags";

import Media from "../../modules/media";
import AstalMpris from "gi://AstalMpris";
import { generalConfig } from "../../config";


export const CenterWindow = (mon: number) => {
    const notifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");

    return <PopupWindow namespace={"center-window"} marginTop={10} monitor={mon}
      halign={Gtk.Align.CENTER} valign={Gtk.Align.START}
      actionKeyPressed={(_, keyval) => {
          if(keyval === Gdk.KEY_space) {
              Media.getDefault().player.available && 
                  Media.getDefault().player.play_pause();
              return true;
          }
      }} $={() => {
          if(notifPopupHPos !== "center")
              return;

          generalConfig.setProperty("notifications.position_h", "left", false);
      }} actionClosed={() => {
          const currentNotifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");
          if(currentNotifPopupHPos === notifPopupHPos)
              return;

          generalConfig.setProperty("notifications.position_h", notifPopupHPos, false);
      }}>
      
        <Gtk.Box class={"center-window-container"} spacing={6}>
            <Gtk.Box class={"left"} orientation={Gtk.Orientation.VERTICAL}>
                <Gtk.Box class={"datetime"} orientation={Gtk.Orientation.VERTICAL}
                  halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} vexpand>

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
              margin={5} spacing={8} alpha={.3} visible={variableToBoolean(
                  createBinding(AstalMpris.get_default(), "players")
              )}
            />
            <BigMedia />
        </Gtk.Box>
    </PopupWindow>;
}
