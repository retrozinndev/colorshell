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
                                className: "link nf",
                                label: "󰌹",
                                tooltipText: "Copy link to Clipboard",
                                visible: bind(players[0], "metadata").as((_meta: GLib.HashTable) =>
                                    players[0].get_meta("xesam:url") === null),
                                onClick: () => execAsync(`sh -c "wl-copy \\"$(playerctl metadata 'xesam:url')\\""`)
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "shuffle nf",
                                visible: bind(players[0], "shuffleStatus").as((shuffleStatus: AstalMpris.Shuffle) =>
                                    shuffleStatus !== AstalMpris.Shuffle.UNSUPPORTED),
                                label: bind(players[0], "shuffleStatus").as((shuffleStatus: AstalMpris.Shuffle) =>
                                    shuffleStatus === AstalMpris.Shuffle.ON ? "󰒝" : "󰒞"),
                                tooltipText: "Toggle Shuffle",
                                onClick: () => players[0].shuffle()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "previous nf",
                                label: "󰒮",
                                tooltipText: "Previous",
                                onClick: () => players[0].canGoPrevious && players[0].previous()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "pause nf",
                                tooltipText: bind(players[0], "playback_status").as((status: AstalMpris.PlaybackStatus) =>
                                    status === AstalMpris.PlaybackStatus.PLAYING ? "Pause" : "Play"),
                                label: bind(players[0], "playbackStatus").as((status: AstalMpris.PlaybackStatus) => 
                                    status === AstalMpris.PlaybackStatus.PLAYING ? "󰏤" : "󰐊"),
                                onClick: () => {
                                    players[0].playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                                        players[0].play()
                                    :
                                        players[0].pause()
                                }
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "next nf",
                                label: "󰒭",
                                tooltipText: "Next",
                                onClick: () => players[0].canGoNext && players[0].next()
                            } as Widget.ButtonProps),
                            new Widget.Button({
                                className: "repeat nf",
                                visible: bind(players[0], "loopStatus").as((loopStatus: AstalMpris.Loop) =>
                                    loopStatus !== AstalMpris.Loop.UNSUPPORTED),
                                label: bind(players[0], "loopStatus").as((loopStatus: AstalMpris.Loop) => {
                                    switch(loopStatus) {
                                        case AstalMpris.Loop.TRACK: return "󰑘";
                                        case AstalMpris.Loop.PLAYLIST: return "󰑖";
                                        default: return "󰑗";
                                    }
                                }),
                                tooltipText: "Toggle Loop",
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
                            return len > 0 ? 
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
