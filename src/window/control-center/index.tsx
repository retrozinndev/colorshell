import { Gtk } from "ags/gtk4";
import { PopupWindow } from "../../widget/PopupWindow";
import { QuickActions } from "./widgets/QuickActions";
import { NotifHistory } from "./widgets/NotifHistory";
import { Tiles } from "./widgets/tiles";
import { Sliders } from "./widgets/Sliders";
import { generalConfig } from "../../config";
import Windows from "..";


export const ControlCenter = Windows.forFocusedMonitor((mon) => {
    const notifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");

    return <PopupWindow namespace={"control-center"} class={"control-center"}
      marginTop={10} marginRight={10} marginBottom={10} monitor={mon}
      $={() => {
          if(notifPopupHPos !== "right") 
              return;

          generalConfig.setProperty("notifications.position_h", "left", false);
      }} onCloseRequest={() => {
          const currentNotifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");

          if(notifPopupHPos === currentNotifPopupHPos) 
              return;

          generalConfig.setProperty("notifications.position_h", notifPopupHPos, false);
      }}>

        <Gtk.Box class={"container"} orientation={Gtk.Orientation.VERTICAL} spacing={16} 
          halign={Gtk.Align.END} valign={Gtk.Align.START} widthRequest={380}>

            <Gtk.Box class={"control-center-container"} vexpand={false}
              orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                
                <QuickActions />
                <Tiles />
                <Sliders />
            </Gtk.Box>
            <NotifHistory />
        </Gtk.Box>
    </PopupWindow>;
});
