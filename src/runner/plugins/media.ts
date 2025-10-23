import { createBinding, createComputed } from "ags";
import { Runner } from "../Runner";
import { secureBaseBinding } from "../../modules/utils";
import { tr } from "../../i18n/intl";

import Media from "../../modules/media";
import AstalMpris from "gi://AstalMpris";


export const PluginMedia = {
    prefix: ":",
    handle: () => !Media.getDefault().player.available ? {
        icon: "folder-music-symbolic",
        title: "Couldn't find any players",
        closeOnClick: false,
        description: "No media / player found with mpris"
    } : [
        {
            icon: secureBaseBinding<AstalMpris.Player>(
                createBinding(Media.getDefault(), "player"), 
                "playbackStatus",
                AstalMpris.PlaybackStatus.PAUSED
            ).as((status) => status === AstalMpris.PlaybackStatus.PLAYING ?
                "media-playback-pause-symbolic"
            : "media-playback-start-symbolic"),
            closeOnClick: false,
            title: createComputed([
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "title",
                    null
                ).as(t => t ?? tr("media.no_title")),
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "artist",
                    null
                ).as(t => t ?? tr("media.no_artist")),
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "playbackStatus",
                    AstalMpris.PlaybackStatus.PAUSED
                )
            ], (title, artist, status) => `${status === AstalMpris.PlaybackStatus.PLAYING ?
                "Pause" : "Play"
            } ${title} | ${artist}`),
            actionClick: () => Media.getDefault().player.play_pause()
        },
        {
            icon: "media-skip-backward-symbolic",
            closeOnClick: false,
            title: createComputed([
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "title",
                    null
                ).as(t => t ?? tr("media.no_title")),
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "artist",
                    null
                ).as(t => t ?? tr("media.no_artist")),
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"),
                    "identity",
                    "Music Player"
                )
            ], (title, artist, identity) =>
                `Go Previous ${title ? title : identity}${artist ? ` | ${artist}` : ""}`
            ),
            actionClick: () => Media.getDefault().player.canGoPrevious && 
                Media.getDefault().player.previous()
        },
        {
            icon: "media-skip-forward-symbolic",
            closeOnClick: false,
            title: createComputed([
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "title",
                    null
                ).as(t => t ?? tr("media.no_title")),
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"), 
                    "artist",
                    null
                ).as(t => t ?? tr("media.no_artist")),
                secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player"),
                    "identity",
                    "Music Player"
                )
            ], (title, artist, identity) =>
                `Go Next ${title ? title : identity}${artist ? ` | ${artist}` : ""}`
            ),
            actionClick: () => Media.getDefault().player.canGoNext && 
                Media.getDefault().player.next()
        }
    ]
} as Runner.Plugin;
