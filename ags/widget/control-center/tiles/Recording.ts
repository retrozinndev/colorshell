import { Tile, TileProps } from "./Tile";
import { Recording } from "../../../scripts/recording";
import { bind, Variable } from "astal";
import { tr } from "../../../i18n/intl";
import { getDateTime } from "../../../scripts/time";

export const TileRecording = Tile({
    title: tr("control_center.tiles.recording.title") || "Screen Recording",
    description: Variable.derive([
        bind(Recording.getDefault(), "recording"),
        getDateTime()
    ], (recording, dateTime) => {
        if(!recording || !Recording.getDefault().startedAt) 
            return tr("control_center.tiles.recording.disabled_desc") || "Start recording";

        const startedAtSeconds = dateTime.to_unix() - Recording.getDefault().startedAt!.to_unix();
        if(startedAtSeconds <= 0) return "00:00";

        const hours = Math.floor(startedAtSeconds / 120);
        const minutes = Math.floor(startedAtSeconds / 60);
        const seconds = Math.floor(startedAtSeconds % 60);

        return `${ hours > 0 ? `${hours < 10 ? `0${hours}` : hours }:` : ""
            }${ minutes < 10 ? `0${minutes}` : minutes 
            }:${ seconds < 10 ? `0${seconds}` : seconds }`;
    })(),
    icon: "󰻂",
    onToggledOff: () => Recording.getDefault().stopRecording(),
    onToggledOn: () => Recording.getDefault().startRecording(),
    toggleState: bind(Recording.getDefault(), "recording"),
    iconSize: 16
} as TileProps);
