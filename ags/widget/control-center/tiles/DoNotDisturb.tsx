import { Notifications } from "../../../scripts/notifications";
import { Tile } from "./Tile";
import { tr } from "../../../i18n/intl";
import { createBinding } from "ags";

export const TileDND = () => 
    <Tile title={tr("control_center.tiles.dnd.title")}
      description={createBinding(Notifications.getDefault().getNotifd(), "dontDisturb").as(
          (dnd: boolean) => dnd ? tr("control_center.tiles.enabled") : tr("control_center.tiles.disabled"))}
      onToggledOff={() => Notifications.getDefault().getNotifd().dontDisturb = false}
      onToggledOn={() => Notifications.getDefault().getNotifd().dontDisturb = true}
      icon={"minus-circle-filled-symbolic"}
      iconSize={16}
      toggleState={Notifications.getDefault().getNotifd().dontDisturb}
    />;
