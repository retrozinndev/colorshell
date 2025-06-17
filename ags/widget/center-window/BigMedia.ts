import { AstalIO, bind, Binding, execAsync, GLib, timeout } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalMpris from "gi://AstalMpris";


export function BigMedia(): Gtk.Widget {
    let dragTimer: (AstalIO.Time|undefined);

    return new Widget.Box({
        className: "big-media",
        orientation: Gtk.Orientation.VERTICAL,
        homogeneous: false,
        width_request: 250,
        visible: bind(AstalMpris.get_default(), "players").as((players: Array<AstalMpris.Player>) => 
            players[0] ? true : false),
        children: bind(AstalMpris.get_default(), "players").as((players: Array<AstalMpris.Player>) =>
            players[0] && [
                new Widget.Box({
                    halign: Gtk.Align.CENTER,
                    child: new Widget.Box({
                        className: "image",
                        hexpand: false,
                        orientation: Gtk.Orientation.VERTICAL,
                        marginTop: 6,
                        visible: getAlbumArt(players[0]).as(Boolean),
                        css: getAlbumArt(players[0]).as((artUrl: string|undefined) => 
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
                            tooltipText: bind(players[0], "title").as((title: string) => !title ? "No Title" : title),
                            label: bind(players[0], "title").as((title: string) => !title ? "No Title" : title),
                            truncate: true,
                            maxWidthChars: 25,
                        } as Widget.LabelProps),
                        new Widget.Label({
                            className: "artist",
                            tooltipText: bind(players[0], "artist").as((artist: string) => !artist ? "No Artist" : artist),
                            label: bind(players[0], "artist").as((artist: string) => !artist ? "No Artist" : artist),
                            maxWidthChars: 28,
                            truncate: true,
                        } as Widget.LabelProps)
                    ]
                } as Widget.BoxProps),
                new Widget.Box({
                    className: "progress",
                    hexpand: true,
                    visible: bind(players[0], "canSeek"),
                    children: [
                        new Widget.Slider({
                            min: 0,
                            hexpand: true,
                            max: bind(players[0], "length").as((length: number) =>
                                Math.floor(length)),
                            value: bind(players[0], "position").as((position: number) =>
                                Math.floor(position)),
                            onDragged: (slider: Widget.Slider) => {
                                if(dragTimer === undefined) 
                                    dragTimer = timeout(600, () =>
                                        players[0].set_position(Math.round(slider.value)));
                                else {
                                    dragTimer.cancel();
                                    dragTimer = timeout(600, () =>
                                        players[0].set_position(Math.round(slider.value)));
                                }
                            }
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
                        label: bind(players[0], "position").as((pos: number) => {
                            const sec: number = Math.floor(pos % 60);
                            return pos > 0 && players[0].length > 0 ? 
                                `${Math.floor(pos / 60)}:${sec < 10 ? "0" : ""}${sec}`
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
                                visible: bind(players[0], "metadata").as((_meta: GLib.HashTable) =>
                                    players[0].get_meta("xesam:url") === null),
                                onClick: () => execAsync(`sh -c "wl-copy \\"$(playerctl metadata 'xesam:url')\\""`)
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "shuffle",
                                visible: bind(players[0], "shuffleStatus").as((shuffleStatus) =>
                                    shuffleStatus !== AstalMpris.Shuffle.UNSUPPORTED),
                                image: new Widget.Icon({
                                    icon: bind(players[0], "shuffleStatus").as((shuffleStatus) =>
                                        shuffleStatus === AstalMpris.Shuffle.ON ? 
                                            "media-playlist-shuffle-symbolic"
                                        : "media-playlist-consecutive-symbolic")
                                } as Widget.IconProps),
                                tooltipText: bind(players[0], "shuffleStatus").as((shuffleStatus) =>
                                    shuffleStatus === AstalMpris.Shuffle.ON ? 
                                        "Shuffle"
                                    : "No shuffle"),
                                onClick: () => players[0].shuffle()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "previous",
                                image: new Widget.Icon({
                                    icon: "media-skip-backward-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Previous",
                                onClick: () => players[0].canGoPrevious && players[0].previous()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "pause",
                                tooltipText: bind(players[0], "playback_status").as((status) =>
                                    status === AstalMpris.PlaybackStatus.PLAYING ? "Pause" : "Play"),
                                image: new Widget.Icon({
                                    icon: bind(players[0], "playbackStatus").as((status) => 
                                        status === AstalMpris.PlaybackStatus.PLAYING ? 
                                            "media-playback-pause-symbolic"
                                        : "media-playback-start-symbolic"),
                                } as Widget.IconProps),
                                onClick: () => players[0].playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                                    players[0].play()
                                : players[0].pause()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "next",
                                image: new Widget.Icon({
                                    icon: "media-skip-forward-symbolic"
                                } as Widget.IconProps),
                                tooltipText: "Next",
                                onClick: () => players[0].canGoNext && players[0].next()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "repeat",
                                visible: bind(players[0], "loopStatus").as((loopStatus) =>
                                    loopStatus !== AstalMpris.Loop.UNSUPPORTED),
                                image: new Widget.Icon({
                                    icon: bind(players[0], "loopStatus").as((loopStatus) => {
                                        switch(loopStatus) {
                                            case AstalMpris.Loop.TRACK: 
                                                return "media-playlist-repeat-song-symbolic";

                                            case AstalMpris.Loop.PLAYLIST: 
                                                return "media-playlist-repeat-symbolic";
                                        }

                                        return "loop-arrow-symbolic";
                                    })
                                } as Widget.IconProps),
                                tooltipText: bind(players[0], "loopStatus").as((loopStatus) => {
                                    switch(loopStatus) {
                                        case AstalMpris.Loop.TRACK: 
                                            return "Loop song";

                                        case AstalMpris.Loop.PLAYLIST: 
                                            return "Loop playlist";
                                    }

                                    return "No loop";
                                }),
                                onClick: () => players[0].loop()
                            } as Widget.ButtonProps)
                        ]
                    } as Widget.BoxProps),
                    endWidget: new Widget.Label({
                        className: "length",
                        valign: Gtk.Align.START,
                        halign: Gtk.Align.END,
                        label: bind(players[0], "length").as((len/* bananananananana */: number) => {
                            const sec: number = Math.floor(len % 60);
                            return (len > 0 && Number.isFinite(len)) ? 
                                `${Math.floor(len / 60)}:${sec < 10 ? "0" : ""}${sec}`
                            : "0:00";
                        })
                    } as Widget.LabelProps)
                })
            ])
    } as Widget.BoxProps);
}


/**
 * This function handles album art/cover of playing media. If a file is provided
 * by the player, it adds the "file://" uri as a prefix, so you can use it in css.
 *
 * @param player the player you want to pull album art from
 * @returns Binding to player.artUrl containing the album art uri, or an undefined binding ig none was found.
* */
function getAlbumArt(player: AstalMpris.Player): Binding<string | undefined> {
    return bind(player, "artUrl").as((artUrl: string) => {

        if(!artUrl) 
            return undefined;

        if(artUrl.startsWith("/")) 
            return "file://" + artUrl;

        return artUrl;
    });
}
