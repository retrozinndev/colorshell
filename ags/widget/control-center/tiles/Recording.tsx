import { Tile } from "./Tile";
import { Recording } from "../../../scripts/recording";
import { tr } from "../../../i18n/intl";
import { isInstalled, time } from "../../../scripts/utils";
import { createBinding, createComputed } from "ags";
import { Gtk } from "ags/gtk4";


export const TileRecording = () => 
    <Tile title={tr("control_center.tiles.recording.title")}
      description={createComputed([
          createBinding(Recording.getDefault(), "recording"),
          time
      ], (recording, dateTime) => {
          if(!recording || !Recording.getDefault().startedAt) 
              return tr("control_center.tiles.recording.disabled_desc") || "Start recording";

          const startedAtSeconds = dateTime.to_unix() - Recording.getDefault().startedAt!;
          if(startedAtSeconds <= 0) return "00:00";

          const minutes = Math.floor(startedAtSeconds / 60);
          const seconds = Math.floor(startedAtSeconds % 60);

          return `${ minutes < 10 ? `0${minutes}` : minutes }:${ seconds < 10 ? `0${seconds}` : seconds }`;
      })}
      icon={"media-record-symbolic"}
      visible={isInstalled("wf-recorder")}
      onToggledOff={() => Recording.getDefault().stopRecording()}
      onToggledOn={() => Recording.getDefault().startRecording()}
      toggleState={createBinding(Recording.getDefault(), "recording")}
      iconSize={16}
    /> as Gtk.Widget;
