import { bind, Variable } from "astal";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import { Runner } from "../Runner";
import AstalMpris from "gi://AstalMpris";

export const PluginMedia = {
    prefix: ":",
    handle() {
        const player = AstalMpris.get_default().players[0];

        if(!player) return new ResultWidget({
            icon: "folder-music-symbolic",
            title: "Couldn't find any players",
            description: "No media / player found with mpris"
        } as ResultWidgetProps);
        return [
            new ResultWidget({
                icon: bind(player, "playbackStatus").as((status) => status === AstalMpris.PlaybackStatus.PLAYING ?
                    "media-playback-pause-symbolic"
                : "media-playback-start-symbolic"),
                title: Variable.derive([
                    bind(player, "title"),
                    bind(player, "artist"),
                    bind(player, "playbackStatus")
                ], (title, artist, status) => `${ status === AstalMpris.PlaybackStatus.PLAYING ?
                    "Pause" : "Play"
                } ${title} | ${artist}`)(),
                onClick: () => player && player.play_pause()
            } as ResultWidgetProps),
            new ResultWidget({
                icon: "media-skip-backward-symbolic",
                title: Variable.derive([
                    bind(player, "title"),
                    bind(player, "artist")
                ], (title, artist) =>
                    `Go Previous ${ title ? title : player.busName }${ artist ? ` | ${artist}` : "" }`
                )(),
                onClick: () => player && player.canGoPrevious && player.previous()
            } as ResultWidgetProps),
            new ResultWidget({
                icon: "media-skip-forward-symbolic",
                title: Variable.derive([
                    bind(player, "title"),
                    bind(player, "artist")
                ], (title, artist) =>
                    `Go Next ${ title ? title : player.busName }${ artist ? ` | ${artist}` : "" }`
                )(),
                onClick: () => player && player.canGoNext && player.next()
            } as ResultWidgetProps)
        ]
    },
} as Runner.Plugin;
