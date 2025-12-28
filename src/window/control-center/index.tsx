import { Astal, Gtk } from "ags/gtk4";
import { PopupWindow } from "../../widget/PopupWindow";
import { QuickActions } from "./widgets/QuickActions";
import { NotifHistory } from "./widgets/NotifHistory";
import { Tiles } from "./widgets/tiles";
import { Sliders } from "./widgets/Sliders";
import { generalConfig } from "../../config";


export const ControlCenter = (mon: number) => {
    const notifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");

    return <PopupWindow namespace={"control-center"} class={"control-center"}
      halign={Gtk.Align.END} valign={Gtk.Align.START} layer={Astal.Layer.OVERLAY}
      marginTop={10} marginRight={10} marginBottom={10} monitor={mon}
      widthRequest={395}
      $={() => {
          if(notifPopupHPos !== "right") 
              return;

          generalConfig.setProperty("notifications.position_h", "left", false);
      }} actionClosed={() => {
          const currentNotifPopupHPos = generalConfig.getProperty("notifications.position_h", "string");

          if(notifPopupHPos === currentNotifPopupHPos) 
              return;

          generalConfig.setProperty("notifications.position_h", notifPopupHPos, false);
      }}>

        <Gtk.Box orientation={Gtk.Orientation.VERTICAL} spacing={16} vexpand={false}>
            <Gtk.Box class={"control-center-container"} vexpand={false}
              orientation={Gtk.Orientation.VERTICAL} spacing={12}>
                
                <QuickActions />
                <Tiles />
                <Sliders />
            </Gtk.Box>
            <NotifHistory />
        </Gtk.Box>
    </PopupWindow> as Astal.Window;
}
