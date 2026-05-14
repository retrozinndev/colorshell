import { Accessor, createBinding, createComputed } from "ags";
import Runner from "..";
import { secureBaseBinding } from "../../modules/utils";
import Media from "../../modules/media";
import AstalMpris from "gi://AstalMpris";


export class PluginMedia implements Runner.Plugin {
    name = "Media";
    prefix = ":";
    prioritize = false;

    handle(_: string) {
        return !Media.getDefault().player?.available ? {
            icon: "folder-music-symbolic",
            title: "Couldn't find any players",
            closeOnClick: false,
            description: "No media / player found with mpris"
        } : [
            {
                icon: secureBaseBinding<AstalMpris.Player>(
                    createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>, 
                    "playbackStatus",
                    AstalMpris.PlaybackStatus.PAUSED
                ).as((status) => status === AstalMpris.PlaybackStatus.PLAYING ?
                    "media-playback-pause-symbolic"
                : "media-playback-start-symbolic"),
                closeOnClick: false,
                title: createComputed([
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>, 
                        "title",
                        null
                    ).as(t => t ?? tr("media.no_title")),
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>, 
                        "artist",
                        null
                    ).as(t => t ?? tr("media.no_artist")),
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>, 
                        "playbackStatus",
                        AstalMpris.PlaybackStatus.PAUSED
                    )
                ], (title, artist, status) => `${status === AstalMpris.PlaybackStatus.PLAYING ?
                    "Pause" : "Play"
                } ${title} | ${artist}`),
                onClicked: () => Media.getDefault().player?.play_pause()
            },
            {
                icon: "media-skip-backward-symbolic",
                closeOnClick: false,
                title: createComputed([
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>,
                        "title",
                        null
                    ).as(t => t ?? tr("media.no_title")),
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>,
                        "artist",
                        null
                    ).as(t => t ?? tr("media.no_artist")),
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>,
                        "identity",
                        "Music Player"
                    )
                ], (title, artist, identity) =>
                    `Go Previous ${title ? title : identity}${artist ? ` | ${artist}` : ""}`
                ),
                onClicked: () => Media.getDefault().player?.canGoPrevious && 
                    Media.getDefault().player?.previous()
            },
            {
                icon: "media-skip-forward-symbolic",
                closeOnClick: false,
                title: createComputed([
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>,
                        "title",
                        null
                    ).as(t => t ?? tr("media.no_title")),
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>,
                        "artist",
                        null
                    ).as(t => t ?? tr("media.no_artist")),
                    secureBaseBinding<AstalMpris.Player>(
                        createBinding(Media.getDefault(), "player") as Accessor<AstalMpris.Player>,
                        "identity",
                        "Music Player"
                    )
                ], (title, artist, identity) =>
                    `Go Next ${title ? title : identity}${artist ? ` | ${artist}` : ""}`
                ),
                onClicked: () => Media.getDefault().player?.canGoNext && 
                    Media.getDefault().player?.next()
            }
        ] satisfies Array<Runner.Result>
    }
}
