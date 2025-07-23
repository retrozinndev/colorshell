import { createBinding, createComputed } from "ags";
import { Runner } from "../Runner";
import { player } from "../../widget/bar/Media";

import AstalMpris from "gi://AstalMpris";


export const PluginMedia = {
    prefix: ":",
    handle: () => !player.get().available ? {
        icon: "folder-music-symbolic",
        title: "Couldn't find any players",
        closeOnClick: false,
        description: "No media / player found with mpris"
    } : [
        {
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
            actionClick: () => player.get().play_pause()
        },
        {
            icon: "media-skip-backward-symbolic",
            closeOnClick: false,
            title: createComputed([
                createBinding(player.get(), "title"),
                createBinding(player.get(), "artist")
            ], (title, artist) =>
                `Go Previous ${ title ? title : player.get().busName }${ artist ? ` | ${artist}` : "" }`
            ),
            actionClick: () => player.get().canGoPrevious && player.get().previous()
        },
        {
            icon: "media-skip-forward-symbolic",
            closeOnClick: false,
            title: createComputed([
                createBinding(player.get(), "title"),
                createBinding(player.get(), "artist")
            ], (title, artist) =>
                `Go Next ${ title ? title : player.get().busName }${ artist ? ` | ${artist}` : "" }`
            ),
            actionClick: () => player.get().canGoNext && player.get().next()
        }
    ]
} as Runner.Plugin;
