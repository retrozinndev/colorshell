import { bind, Variable } from "astal";
import { ResultWidget, ResultWidgetProps } from "../../widget/runner/ResultWidget";
import { Runner } from "../Runner";
import AstalMpris from "gi://AstalMpris";

export const PluginMedia = (() => {
    let playTitle: Variable<string>|null;
    let previousTitle: Variable<string>|null;
    let nextTitle: Variable<string>|null;

    return {
        prefix: ":",

        onClose: () => {
            playTitle?.drop();
            previousTitle?.drop();
            nextTitle?.drop();

            previousTitle = null;
            playTitle = null;
            nextTitle = null;
        },

        handle() {
            const player = AstalMpris.get_default().players[0];

            playTitle = Variable.derive([
                bind(player, "title"),
                bind(player, "artist"),
                bind(player, "playbackStatus")
            ], (title, artist, status) => `${ status === AstalMpris.PlaybackStatus.PLAYING ?
                "Pause" : "Play"
            } ${title} | ${artist}`);

            previousTitle = Variable.derive([
                bind(player, "title"),
                bind(player, "artist")
            ], (title, artist) =>
                `Go Previous ${ title ? title : player.busName }${ artist ? ` | ${artist}` : "" }`
            );

            nextTitle = Variable.derive([
                bind(player, "title"),
                bind(player, "artist")
            ], (title, artist) =>
                `Go Next ${ title ? title : player.busName }${ artist ? ` | ${artist}` : "" }`
            );

            if(!player) return new ResultWidget({
                icon: "folder-music-symbolic",
                title: "Couldn't find any players",
                closeOnClick: false,
                description: "No media / player found with mpris"
            } as ResultWidgetProps);
            return [
                new ResultWidget({
                    icon: bind(player, "playbackStatus").as((status) => status === AstalMpris.PlaybackStatus.PLAYING ?
                        "media-playback-pause-symbolic"
                    : "media-playback-start-symbolic"),
                    closeOnClick: false,
                    title: playTitle(),
                    onClick: () => player && player.play_pause()
                } as ResultWidgetProps),
                new ResultWidget({
                    icon: "media-skip-backward-symbolic",
                    closeOnClick: false,
                    title: previousTitle(),
                    onClick: () => player && player.canGoPrevious && player.previous()
                } as ResultWidgetProps),
                new ResultWidget({
                    icon: "media-skip-forward-symbolic",
                    closeOnClick: false,
                    title: nextTitle(),
                    onClick: () => player && player.canGoNext && player.next()
                } as ResultWidgetProps)
            ]
        },
    } as Runner.Plugin
})();
