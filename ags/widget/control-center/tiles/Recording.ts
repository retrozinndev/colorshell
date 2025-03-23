import { Tile, TileProps } from "./Tile";
import { Recording } from "../../../scripts/recording";
import { bind } from "astal";
import { tr } from "../../../i18n/intl";

export const TileRecording = Tile({
    title: tr("control_center.tiles.recording.title") || "Screen Recording",
    description: bind(Recording.getDefault(), "recording").as(
        (isRecording: boolean) => isRecording ? 
            "Recording {time}" 
        : tr("control_center.tiles.recording.disabled_desc") || "Start recording"
    ),
    icon: "󰻂",
    onToggledOff: () => Recording.getDefault().stopRecording(),
    onToggledOn: () => Recording.getDefault().startRecording(),
    iconSize: 16,
    toggleState: bind(Recording.getDefault(), "recording"),
} as TileProps);
