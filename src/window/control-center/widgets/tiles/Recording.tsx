import { Tile } from "./Tile";
import { Recording } from "../../../../modules/recording";
import { tr } from "../../../../i18n/intl";
import { isInstalled } from "../../../../modules/utils";
import { createBinding, createComputed } from "ags";


export const TileRecording = () => 
    <Tile title={tr("control_center.tiles.recording.title")}
      description={createComputed([
          createBinding(Recording.getDefault(), "recording"),
          createBinding(Recording.getDefault(), "recordingTime")
      ], (recording, time) => {
          if(!recording || !Recording.getDefault().startedAt) 
              return tr("control_center.tiles.recording.disabled_desc") || "Start recording";

          return time;
      })}
      icon={"media-record-symbolic"}
      visible={isInstalled("wf-recorder")}
      onDisabled={() => Recording.getDefault().stopRecording()}
      onEnabled={() => Recording.getDefault().startRecording()}
      state={createBinding(Recording.getDefault(), "recording")}
      toggleOnClick
    />;
