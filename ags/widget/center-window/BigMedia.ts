import { AstalIO, bind, Binding, exec, timeout, GLib } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalMpris from "gi://AstalMpris";
import { AstalPlayers } from "../../scripts/player";
import { createSlider, typeSliders } from "../assets/Slider";
import { Wallpaper } from "../../scripts/wallpaper";
import { ProgressBar } from "../assets/ProgressBar";

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
    const players = AstalPlayers.getDefault();

    const playerSlider = createSlider({
        getValue: () => players.activePlayer?.get_position() ?? 0,
        getMaxValue: () => players.activePlayer?.get_length() ?? 0,
        setValue: (value) => players.activePlayer?.set_position(value),
        getPlaybackStatus: () => players.activePlayer?.playback_status,
        getColor: () => "#4285F4",
        realtimeChangeValue: () => false,
        typeSlider: () => typeSliders.MATERIAL_EXPRESSIVE_WAVE
    });

    return new Widget.Box({
        className: "big-media",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        width_request: 250,
        visible: bind(players, "activePlayer").as(Boolean),
        children: [
            new Widget.Box({
                halign: Gtk.Align.CENTER,
                child: new Widget.Box({
                    className: "image",
                    hexpand: false,
                    orientation: Gtk.Orientation.VERTICAL,
                    marginTop: 6,
                    visible: bind(players, "activePlayer").as(p => p && p.cover_art),
                    css: bind(players, "activePlayer").as(p =>
                        p?.cover_art ? `.image { background-image: url('${p.cover_art}'); }` : undefined),
                    width_request: 132,
                    height_request: 128
                })
            }),
            new Widget.Box({
                className: "info",
                orientation: Gtk.Orientation.VERTICAL,
                vexpand: true,
                valign: Gtk.Align.CENTER,
                children: [
                    new Widget.Label({
                        className: "title",
                        tooltipText: bind(players, "activePlayer").as(p => p?.title ?? "No Title"),
                        label: bind(players, "activePlayer").as(p => p?.title ?? "No Title"),
                        truncate: true,
                        maxWidthChars: 25
                    }),
                    new Widget.Label({
                        className: "artist",
                        tooltipText: bind(players, "activePlayer").as(p => p?.artist ?? p?.get_identity() ?? "No Artist"),
                        label: bind(players, "activePlayer").as(p => p?.artist ?? p?.get_identity() ?? "No Artist"),
                        maxWidthChars: 28,
                        truncate: true
                    })
                ]
            }),
            new Widget.Box({
                className: "progress",
                hexpand: true,
                visible: bind(players, "activePlayer").as(p => p?.can_seek ?? false),
                children: [ playerSlider ]
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
                    label: bind(players, "activePlayer").as((p: AstalMpris.Player) => {
                        const pos = p?.position ?? 0;
                        const len = p?.length ?? 0;
                        return formatTime(pos > 0 && len > 0 ? pos : 0);
                    })
                }),
                centerWidget: new Widget.Box({
                    className: "controls button-row",
                    children: [
                        // new Widget.Button({
                        //     className: "link",
                        //     image: new Widget.Icon({
                        //         icon: "edit-paste-symbolic"
                        //     } as Widget.IconProps),
                        //     tooltipText: "Copy link to Clipboard",
                        //     visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p.metadata ? true : false),
                        //     onClickRelease: async () => {
                        //         const link = exec(`playerctl --player=${
                        //             players.activePlayer.busName.replace(/^org\.mpris\.MediaPlayer2\./i, "")
                        //             } metadata xesam:url`);
                        //         link && Clipboard.getDefault().copyAsync(link);
                        //     }
                        // } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "shuffle",
                            visible: bind(players, "activePlayer").as((p: AstalMpris.Player) =>
                                p?.shuffleStatus !== AstalMpris.Shuffle.UNSUPPORTED),
                            image: new Widget.Icon({
                                icon: bind(players, "activePlayer").as((p: AstalMpris.Player) =>
                                    p?.shuffleStatus === AstalMpris.Shuffle.ON ? 
                                        "media-playlist-shuffle-symbolic"
                                    : "media-playlist-consecutive-symbolic")
                            } as Widget.IconProps),
                            tooltipText: bind(players, "activePlayer").as((p: AstalMpris.Player) =>
                                p?.shuffleStatus === AstalMpris.Shuffle.ON ? 
                                    "Shuffle"
                                : "No shuffle"),
                            onClickRelease: () => players.activePlayer.shuffle()
                        } as Widget.ButtonProps),
                        new Widget.Button({
                            className: "previous",
                            visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p.canGoPrevious ? true : false),
                            image: new Widget.Icon({ icon: "media-skip-backward-symbolic" }),
                            tooltipText: "Previous",
                            onClickRelease: () => players.activePlayer.canGoPrevious && players.activePlayer.previous()
                        }),
                        new Widget.Button({
                            className: "play-pause",
                            tooltipText: bind(players, "activePlayer").as((p: AstalMpris.Player) => 
                                p.playback_status === AstalMpris.PlaybackStatus.PLAYING 
                                    ? "Pause" : "Play"),
                            image: new Widget.Icon({
                                icon:  bind(players, "activePlayer").as((p: AstalMpris.Player) => 
                                    p.playback_status === AstalMpris.PlaybackStatus.PLAYING 
                                        ? "media-playback-pause-symbolic" : "media-playback-start-symbolic"),
                            }),
                            onClickRelease: () => players.activePlayer.play_pause()
                        }),
                        new Widget.Button({
                            className: "next",
                            image: new Widget.Icon({ icon: "media-skip-forward-symbolic" }),
                            tooltipText: "Next",
                            visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p?.can_go_next ? true : false),
                            onClickRelease: () => players.activePlayer.can_go_next && players.activePlayer.next()
                        }),
                        new Widget.Button({
                            className: "repeat",
                            visible: bind(players, "activePlayer").as((p: AstalMpris.Player) =>
                                p.loopStatus !== AstalMpris.Loop.UNSUPPORTED),
                            image: new Widget.Icon({
                                icon: bind(players, "activePlayer").as((p: AstalMpris.Player) => {
                                    switch(p.loopStatus) {
                                        case AstalMpris.Loop.TRACK: 
                                            return "media-playlist-repeat-song-symbolic";
                                        case AstalMpris.Loop.PLAYLIST: 
                                            return "media-playlist-repeat-symbolic";
                                    }
                                    return "loop-arrow-symbolic";
                                })
                            } as Widget.IconProps),
                            tooltipText: bind(players, "activePlayer").as((p: AstalMpris.Player) => {
                                switch(p.loopStatus) {
                                    case AstalMpris.Loop.TRACK: 
                                        return "Loop song";
                                    case AstalMpris.Loop.PLAYLIST: 
                                        return "Loop playlist";
                                }
                                return "No loop";
                            }),
                            onClickRelease: () => players.activePlayer.loop()
                        } as Widget.ButtonProps)
                    ]
                }),
                endWidget: new Widget.Label({
                    className: "length",
                    valign: Gtk.Align.START,
                    halign: Gtk.Align.END,
                    label: bind(players, "activePlayer").as(p => {
                        const len = p?.length ?? 0;
                        if (len <= 0) return "0:00";
                        if (len > GLib.MAXINT64 / 10000000) return "Live";
                        return formatTime(len);
                    })
                })
            })
        ]
    });
}
