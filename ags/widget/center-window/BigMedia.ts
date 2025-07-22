import { AstalIO, bind, Binding, exec, timeout, GLib } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalMpris from "gi://AstalMpris";
import { AstalPlayers } from "../../scripts/player";
import { Stylesheet } from "../../scripts/stylesheet";
import { progressBar } from "./Slider";

export function BigMedia(): Gtk.Widget {
    return new Widget.Box({
        className: "big-media",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        width_request: 250,
        visible: bind(AstalPlayers.getDefault(), "activePlayer").as((actviePlayer: AstalMpris.Player) => 
            actviePlayer ? true : false),
        children: bind(AstalPlayers.getDefault(), "activePlayer").as((actviePlayer: AstalMpris.Player) =>
            actviePlayer && [
                new Widget.Box({
                    halign: Gtk.Align.CENTER,
                    child: new Widget.Box({
                        className: "image",
                        hexpand: false,
                        orientation: Gtk.Orientation.VERTICAL,
                        marginTop: 6,
                        visible: bind(actviePlayer, "coverArt").as(Boolean),
                        css: bind(actviePlayer, "coverArt").as((artUrl: string|undefined) => 
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
                            tooltipText: bind(actviePlayer, "title").as((title: string) => !title ? "No Title" : title),
                            label: bind(actviePlayer, "title").as((title: string) => !title ? "No Title" : title),
                            truncate: true,
                            maxWidthChars: 25,
                        } as Widget.LabelProps),
                        new Widget.Label({
                            className: "artist",
                            tooltipText: bind(actviePlayer, "artist").as((artist: string) => !artist ? (actviePlayer.get_identity() ?? "No Artist") : artist),
                            label: bind(actviePlayer, "artist").as((artist: string) => !artist ? (actviePlayer.get_identity() ?? "No Artist") : artist),
                            maxWidthChars: 28,
                            truncate: true,
                        } as Widget.LabelProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "progress",
                    hexpand: true,
                    visible: bind(actviePlayer, "canSeek"),
                    children: [
                        progressBar(actviePlayer)
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
                        label: bind(actviePlayer, "position").as((pos: number) => {
                            const sec: number = Math.floor(pos % 60);
                            const min = Math.floor((pos % 3600) / 60);
                            const hours: number = Math.floor(pos / 3600);
                            return pos > 0 && actviePlayer.length > 0 ? 
                                `${hours > 0 ? `${hours}:` : ''}${min < 10 && hours > 0 ? `0${min}` : `${min}`}:${sec < 10 ? `0${sec}` : `${sec}`}`
                                    : `0:00`;
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
                                visible: bind(actviePlayer, "metadata").as(Boolean),
                                onClickRelease: async () => {
                                    const link = exec(`playerctl --player=${
                                        actviePlayer.busName.replace(/^org\.mpris\.MediaPlayer2\./i, "")
                                    } metadata xesam:url`);
                                    link && Clipboard.getDefault().copyAsync(link);
                                }
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "shuffle",
                                visible: bind(actviePlayer, "shuffleStatus").as((shuffleStatus) =>
                                    shuffleStatus !== AstalMpris.Shuffle.UNSUPPORTED),
                                image: new Widget.Icon({
                                    icon: bind(actviePlayer, "shuffleStatus").as((shuffleStatus) =>
                                        shuffleStatus === AstalMpris.Shuffle.ON ? 
                                            "media-playlist-shuffle-symbolic"
                                        : "media-playlist-consecutive-symbolic")
                                } as Widget.IconProps),
                                tooltipText: bind(actviePlayer, "shuffleStatus").as((shuffleStatus) =>
                                    shuffleStatus === AstalMpris.Shuffle.ON ? 
                                        "Shuffle"
                                    : "No shuffle"),
                                onClickRelease: () => actviePlayer.shuffle()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "previous",
                                image: new Widget.Icon({
                                    icon: "media-skip-backward-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Previous",
                                onClickRelease: () => actviePlayer.canGoPrevious && actviePlayer.previous()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "pause",
                                tooltipText: bind(actviePlayer, "playback_status").as((status) =>
                                    status === AstalMpris.PlaybackStatus.PLAYING ? "Pause" : "Play"),
                                image: new Widget.Icon({
                                    icon: bind(actviePlayer, "playbackStatus").as((status) => 
                                        status === AstalMpris.PlaybackStatus.PLAYING ? 
                                            "media-playback-pause-symbolic"
                                        : "media-playback-start-symbolic"),
                                } as Widget.IconProps),
                                onClickRelease: () => actviePlayer.playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                                    actviePlayer.play()
                                : actviePlayer.pause()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "next",
                                image: new Widget.Icon({
                                    icon: "media-skip-forward-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Next",
                                onClickRelease: () => actviePlayer.canGoNext && actviePlayer.next()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "repeat",
                                visible: bind(actviePlayer, "loopStatus").as((loopStatus) =>
                                    loopStatus !== AstalMpris.Loop.UNSUPPORTED),
                                image: new Widget.Icon({
                                    icon: bind(actviePlayer, "loopStatus").as((loopStatus) => {
                                        switch(loopStatus) {
                                            case AstalMpris.Loop.TRACK: 
                                                return "media-playlist-repeat-song-symbolic";

                                            case AstalMpris.Loop.PLAYLIST: 
                                                return "media-playlist-repeat-symbolic";
                                        }

                                        return "loop-arrow-symbolic";
                                    })
                                } as Widget.IconProps),
                                tooltipText: bind(actviePlayer, "loopStatus").as((loopStatus) => {
                                    switch(loopStatus) {
                                        case AstalMpris.Loop.TRACK: 
                                            return "Loop song";

                                        case AstalMpris.Loop.PLAYLIST: 
                                            return "Loop playlist";
                                    }

                                    return "No loop";
                                }),
                                onClickRelease: () => actviePlayer.loop()
                            } as Widget.ButtonProps)
                        ]
                    } as Widget.BoxProps),
                    endWidget: new Widget.Label({
                        className: "length",
                        valign: Gtk.Align.START,
                        halign: Gtk.Align.END,
                        label: bind(actviePlayer, "length").as((len/* bananananananana */: number) => {

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
