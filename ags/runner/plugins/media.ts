import { createBinding, createComputed } from "ags";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import { Runner } from "../Runner";
import AstalMpris from "gi://AstalMpris";
import { player } from "../../widget/bar/Media";

export const PluginMedia = {
    prefix: ":",
    handle() {
        if(!player.get().available) return new ResultWidget({
            icon: "folder-music-symbolic",
            title: "Couldn't find any players",
            closeOnClick: false,
            description: "No media / player found with mpris"
        } as ResultWidgetProps);

        return [
            new ResultWidget({
                icon: createBinding(player.get(), "playbackStatus").as((status) => status === AstalMpris.PlaybackStatus.PLAYING ?
                    "media-playback-pause-symbolic"
                : "media-playback-start-symbolic"),
                closeOnClick: false,
                title: createComputed([
                    createBinding(player.get(), "title"),
                    createBinding(player.get(), "artist"),
                    createBinding(player.get(), "playbackStatus")
                ], (title, artist, status) => `${ status === AstalMpris.PlaybackStatus.PLAYING ?
                    "Pause" : "Play"
                } ${title} | ${artist}`),
                onClick: () => player.get().play_pause()
            } as ResultWidgetProps),
            new ResultWidget({
                icon: "media-skip-backward-symbolic",
                closeOnClick: false,
                title: createComputed([
                    createBinding(player.get(), "title"),
                    createBinding(player.get(), "artist")
                ], (title, artist) =>
                    `Go Previous ${ title ? title : player.get().busName }${ artist ? ` | ${artist}` : "" }`
                ),
                onClick: () => player.get().canGoPrevious && player.get().previous()
            } as ResultWidgetProps),
            new ResultWidget({
                icon: "media-skip-forward-symbolic",
                closeOnClick: false,
                title: createComputed([
                    createBinding(player.get(), "title"),
                    createBinding(player.get(), "artist")
                ], (title, artist) =>
                    `Go Next ${ title ? title : player.get().busName }${ artist ? ` | ${artist}` : "" }`
                ),
                onClick: () => player.get().canGoNext && player.get().next()
            } as ResultWidgetProps)
        ]
    },
} as Runner.Plugin;
