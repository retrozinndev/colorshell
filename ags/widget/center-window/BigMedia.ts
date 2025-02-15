import { AstalIO, bind, GLib, Process, timeout } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalMpris from "gi://AstalMpris";

let dragTimer: (AstalIO.Time|undefined);

export const BigMedia: Gtk.Widget = new Widget.Box({
    className: "big-media",
    orientation: Gtk.Orientation.VERTICAL,
    homogeneous: false,
    children: bind(AstalMpris.get_default(), "players").as((players: Array<AstalMpris.Player>) =>
        players[0] ? [
            new Widget.Box({
                halign: Gtk.Align.CENTER,
                child: new Widget.Box({
                    className: "image",
                    hexpand: false,
                    orientation: Gtk.Orientation.VERTICAL,
                    visible: bind(players[0], "coverArt").as((coverArt: string) => 
                        coverArt !== ""),
                    css: bind(players[0], "coverArt").as((coverArt: string) => 
                        `.image { background-image: url('${coverArt}'); }`),
                    width_request: 132,
                    height_request: 128
                } as Widget.BoxProps)
            } as Widget.BoxProps),
            new Widget.Box({
                className: "info",
                orientation: Gtk.Orientation.VERTICAL,
                children: [
                    new Widget.Label({
                        className: "title",
                        tooltipText: bind(players[0], "title").as((title: string) => !title ? "No Title" : title),
                        label: bind(players[0], "title").as((title: string) => !title ? "No Title" : title),
                        truncate: true
                    } as Widget.LabelProps),
                    new Widget.Label({
                        className: "artist",
                        tooltipText: bind(players[0], "artist").as((artist: string) => !artist ? "No Artist" : artist),
                        label: bind(players[0], "artist").as((artist: string) => !artist ? "No Artist" : artist),
                        truncate: true
                    } as Widget.LabelProps)
                ]
            } as Widget.BoxProps),
            new Widget.Box({
                className: "progress",
                hexpand: true,
                visible: bind(players[0], "canSeek"),
                children: [
                    /*new Widget.Label({
                        className: "elapsed",
                        label: bind(players[0], "position").as((position: number) =>
                            Math.floor(position).toString())
                    }),*/
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
            new Widget.Box({
                className: "controls button-row",
                hexpand: true,
                halign: Gtk.Align.CENTER,
                children: [
                    new Widget.Button({
                        className: "link nf",
                        label: "󰌹",
                        tooltipText: "Copy link to Clipboard",
                        visible: bind(players[0], "metadata").as((_metadata: GLib.HashTable) =>
                            players[0].get_meta("xesam:url") === null),
                        onClick: () => Process.exec(`wl-copy ${players[0].get_meta("xesam:url")?.get_string()[0]}`)
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
                    } as Widget.ButtonProps)
                ]
            })
        ] : new Widget.Box({ className: "empty no-media" }))
} as Widget.BoxProps);
