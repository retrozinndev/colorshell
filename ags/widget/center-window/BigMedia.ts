import { AstalIO, bind, Binding, exec, timeout, GLib } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalMpris from "gi://AstalMpris";
import { AstalPlayers } from "../../scripts/player";
import { Stylesheet } from "../../scripts/stylesheet";
import { createUnifiedSlider } from "./Slider";

function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const totalSeconds = Math.floor(seconds);
    const sec = totalSeconds % 60;
    const min = Math.floor((totalSeconds % 3600) / 60);
    const hours = Math.floor(totalSeconds / 3600);

    const minStr = (min < 10 && hours > 0) ? `0${min}` : `${min}`;
    const secStr = (sec < 10) ? `0${sec}` : `${sec}`;

    if (hours > 0) {
        return `${hours}:${minStr}:${secStr}`;
    }
    return `${min}:${secStr}`;
}

export function BigMedia(): Gtk.Widget {
    return new Widget.Box({
        className: "big-media",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        width_request: 250,
        visible: bind(AstalPlayers.getDefault(), "activePlayer").as((activePlayer: AstalMpris.Player) => 
            activePlayer ? true : false),
        children: bind(AstalPlayers.getDefault(), "activePlayer").as((activePlayer: AstalMpris.Player) =>
            activePlayer && [
                new Widget.Box({
                    halign: Gtk.Align.CENTER,
                    child: new Widget.Box({
                        className: "image",
                        hexpand: false,
                        orientation: Gtk.Orientation.VERTICAL,
                        marginTop: 6,
                        visible: bind(activePlayer, "coverArt").as(Boolean),
                        css: bind(activePlayer, "coverArt").as((artUrl: string|undefined) => 
                            artUrl ? `.image { background-image: url('${artUrl}'); }` : undefined),
                        width_request: 132,
                        height_request: 128
                    } as Widget.BoxProps)
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "info",
                    orientation: Gtk.Orientation.VERTICAL,
                    vexpand: true,
                    valign: Gtk.Align.CENTER,
                    children: [
                        new Widget.Label({
                            className: "title",
                            tooltipText: bind(activePlayer, "title").as((title: string) => !title ? "No Title" : title),
                            label: bind(activePlayer, "title").as((title: string) => !title ? "No Title" : title),
                            truncate: true,
                            maxWidthChars: 25,
                        } as Widget.LabelProps),
                        new Widget.Label({
                            className: "artist",
                            tooltipText: bind(activePlayer, "artist").as((artist: string) => !artist ? (activePlayer.get_identity() ?? "No Artist") : artist),
                            label: bind(activePlayer, "artist").as((artist: string) => !artist ? (activePlayer.get_identity() ?? "No Artist") : artist),
                            maxWidthChars: 28,
                            truncate: true,
                        } as Widget.LabelProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "progress",
                    hexpand: true,
                    visible: bind(activePlayer, "canSeek"),
                    children: [
                        createUnifiedSlider({
                            getValue: () => activePlayer.get_position(),
                            getMaxValue: () => activePlayer.get_length(),
                            setValue: (value) => activePlayer.set_position(value),
                            getPlaybackStatus: () => activePlayer.playback_status,
                            realtimeChangeValue: () => false
                        })
                    ]
                }),
                new Widget.CenterBox({
                    className: "bottom",
                    homogeneous: false,
                    hexpand: true,
                    marginBottom: 6,
                    startWidget: new Widget.Label({
                        className: "elapsed",
                        valign: Gtk.Align.START,
                        halign: Gtk.Align.START,
                        label: bind(activePlayer, "position").as((pos: number) => {
                            return formatTime(pos > 0 && activePlayer.length > 0 ? pos : 0);
                        })
                    } as Widget.LabelProps),
                    centerWidget: new Widget.Box({
                        className: "controls button-row",
                        children: [
                            new Widget.Button({
                                className: "link",
                                image: new Widget.Icon({
                                    icon: "edit-paste-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Copy link to Clipboard",
                                visible: bind(activePlayer, "metadata").as(Boolean),
                                onClickRelease: async () => {
                                    const link = exec(`playerctl --player=${
                                        activePlayer.busName.replace(/^org\.mpris\.MediaPlayer2\./i, "")
                                    } metadata xesam:url`);
                                    link && Clipboard.getDefault().copyAsync(link);
                                }
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "shuffle",
                                visible: bind(activePlayer, "shuffleStatus").as((shuffleStatus) =>
                                    shuffleStatus !== AstalMpris.Shuffle.UNSUPPORTED),
                                image: new Widget.Icon({
                                    icon: bind(activePlayer, "shuffleStatus").as((shuffleStatus) =>
                                        shuffleStatus === AstalMpris.Shuffle.ON ? 
                                            "media-playlist-shuffle-symbolic"
                                        : "media-playlist-consecutive-symbolic")
                                } as Widget.IconProps),
                                tooltipText: bind(activePlayer, "shuffleStatus").as((shuffleStatus) =>
                                    shuffleStatus === AstalMpris.Shuffle.ON ? 
                                        "Shuffle"
                                    : "No shuffle"),
                                onClickRelease: () => activePlayer.shuffle()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "previous",
                                image: new Widget.Icon({
                                    icon: "media-skip-backward-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Previous",
                                onClickRelease: () => activePlayer.canGoPrevious && activePlayer.previous()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "pause",
                                tooltipText: bind(activePlayer, "playback_status").as((status) =>
                                    status === AstalMpris.PlaybackStatus.PLAYING ? "Pause" : "Play"),
                                image: new Widget.Icon({
                                    icon: bind(activePlayer, "playbackStatus").as((status) => 
                                        status === AstalMpris.PlaybackStatus.PLAYING ? 
                                            "media-playback-pause-symbolic"
                                        : "media-playback-start-symbolic"),
                                } as Widget.IconProps),
                                onClickRelease: () => activePlayer.playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                                    activePlayer.play()
                                : activePlayer.pause()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "next",
                                image: new Widget.Icon({
                                    icon: "media-skip-forward-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Next",
                                onClickRelease: () => activePlayer.canGoNext && activePlayer.next()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "repeat",
                                visible: bind(activePlayer, "loopStatus").as((loopStatus) =>
                                    loopStatus !== AstalMpris.Loop.UNSUPPORTED),
                                image: new Widget.Icon({
                                    icon: bind(activePlayer, "loopStatus").as((loopStatus) => {
                                        switch(loopStatus) {
                                            case AstalMpris.Loop.TRACK: 
                                                return "media-playlist-repeat-song-symbolic";

                                            case AstalMpris.Loop.PLAYLIST: 
                                                return "media-playlist-repeat-symbolic";
                                        }

                                        return "loop-arrow-symbolic";
                                    })
                                } as Widget.IconProps),
                                tooltipText: bind(activePlayer, "loopStatus").as((loopStatus) => {
                                    switch(loopStatus) {
                                        case AstalMpris.Loop.TRACK: 
                                            return "Loop song";

                                        case AstalMpris.Loop.PLAYLIST: 
                                            return "Loop playlist";
                                    }

                                    return "No loop";
                                }),
                                onClickRelease: () => activePlayer.loop()
                            } as Widget.ButtonProps)
                        ]
                    } as Widget.BoxProps),
                    endWidget: new Widget.Label({
                        className: "length",
                        valign: Gtk.Align.START,
                        halign: Gtk.Align.END,
                        label: bind(activePlayer, "length").as((len/* bananananananana */: number) => {

                            const sec: number = Math.floor(len % 60);
                            const min = Math.floor((len % 3600) / 60);
                            const hours: number = Math.floor(len / 3600);

                            //console.log("Len:", len, "\nLen in hours:", hours);
                            return (len > 0 && len < GLib.MAXINT64 / 10000000) ?
                                `${hours > 0 ? `${hours}:` : ''}${min < 10 && hours > 0 ? `0${min}` : `${min}`}:${sec < 10 ? `0${sec}` : `${sec}`}`
                                    : ( len <= 0 ? `0:00` : "Live");
                        })
                    } as Widget.LabelProps)
                })
            ])
    } as Widget.BoxProps);
}
