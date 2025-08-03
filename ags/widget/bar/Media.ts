import { Variable, bind, exec } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import AstalMpris from "gi://AstalMpris";
import { getSymbolicIcon } from "../../scripts/apps";
import { Separator, SeparatorProps } from "../Separator";
import { Windows } from "../../windows";
import { Clipboard } from "../../scripts/clipboard";

import { AstalPlayers } from "../../scripts/player";

export function Media(): Gtk.Widget {

    const players = AstalPlayers.getDefault();

    const mediaControlsRevealer: Widget.Revealer = new Widget.Revealer({
        transitionType: Gtk.RevealerTransitionType.SLIDE_RIGHT,
        transitionDuration: 260,
        revealChild: false,
        child: new Widget.Box({
            className: "media-controls button-row",
            expand: false,
            homogeneous: false,
            children: [
                // new Widget.Button({
                //     className: "link",
                //     image: new Widget.Icon({
                //         icon: "edit-paste-symbolic"
                //     } as Widget.IconProps),
                //     tooltipText: "Copy link to Clipboard",
                //     // AstalMpris.Player.metadata works only sometimes, so I'm not using it
                //     visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p.metadata ? true : false),
                //     onClickRelease: async () => {
                //         const link = exec(`playerctl --player=${
                //             players.activePlayer.busName.replace(/^org\.mpris\.MediaPlayer2\./i, "")
                //         } metadata xesam:url`);
                //         link && Clipboard.getDefault().copyAsync(link);
                //     }
                // } as Widget.ButtonProps),
                new Widget.Button({
                    className: "previous",
                    visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p.canGoPrevious ? true : false),
                    image: new Widget.Icon({
                        icon: "media-skip-backward-symbolic"
                    } as Widget.IconProps),
                    tooltipText: "Previous",
                    onClickRelease: () => players.activePlayer.canGoPrevious && players.activePlayer.previous()
                } as Widget.ButtonProps),
                new Widget.Button({
                    className: "play-pause",
                    tooltipText: bind(players, "activePlayer").as((p: AstalMpris.Player) =>
                        p?.playback_status === AstalMpris.PlaybackStatus.PLAYING 
                            ? "Pause" : "Play"),
                    image: new Widget.Icon({
                        icon: bind(players, "activePlayer").as((p: AstalMpris.Player) => 
                        p?.playbackStatus === AstalMpris.PlaybackStatus.PLAYING ? 
                            "media-playback-pause-symbolic"
                        : "media-playback-start-symbolic")
                    } as Widget.IconProps),
                    onClickRelease: () => players.activePlayer.playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                        players.activePlayer.play()
                    : players.activePlayer.pause()
                } as Widget.ButtonProps),
                new Widget.Button({
                    className: "next",
                    visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p.canGoNext ? true : false),
                    image: new Widget.Icon({
                        icon: "media-skip-forward-symbolic"
                    } as Widget.IconProps),
                    tooltipText: "Next",
                    onClickRelease: () => players.activePlayer.canGoNext && players.activePlayer.next()
                } as Widget.ButtonProps)
            ]
        } as Widget.BoxProps)
    } as Widget.RevealerProps);

    const mediaWidget = new Widget.EventBox({
        className: "media-eventbox",
        visible: bind(players, "activePlayer").as((activePlayer: AstalMpris.Player) => 
            activePlayer && activePlayer.get_available()),
        onClick: () => Windows.toggle("center-window"),
        child: new Widget.Box({
            className: "media", 
            children: [
                new Widget.Box({
                    spacing: 4,
                    children: [
                            new Widget.Icon({
                                icon: bind(players, "activePlayer").as((p: AstalMpris.Player) => getSymbolicIcon(p.get_entry()) ?? 
                                    getSymbolicIcon(p.get_bus_name().split('.').filter(str => !str.toLowerCase().includes('instance')).join('.')) ??
                                        "folder-music-symbolic")
                            } as Widget.IconProps),
                            new Widget.Label({
                                className: "title",
                                label: bind(players, "activePlayer").as((p: AstalMpris.Player) => p?.title ?? "No Title"),
                                maxWidthChars: 20,
                                truncate: true
                            } as Widget.LabelProps),
                            Separator({
                                visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p?.artist ? true : false),
                                orientation: Gtk.Orientation.HORIZONTAL,
                                size: 1,
                                margin: 5,
                                alpha: .3
                            } as SeparatorProps),
                            new Widget.Label({
                                className: "artist",
                                visible: bind(players, "activePlayer").as((p: AstalMpris.Player) => p?.artist ? true : false),
                                label: bind(players, "activePlayer").as((p: AstalMpris.Player) => p?.artist ?? "No Artist"),
                                maxWidthChars: 18,
                                truncate: true
                            } as Widget.LabelProps)
                        ]
                } as Widget.BoxProps),
                mediaControlsRevealer
            ]
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);

    mediaWidget.hook(mediaWidget, 'hover', () => {
        if (!Windows.isVisible("center-window")) {
            mediaControlsRevealer.set_reveal_child(true);
            mediaWidget.className = mediaWidget.className + " reveal";
        }
    });

    mediaWidget.hook(mediaWidget, 'hover-lost', (_) => {
        mediaControlsRevealer.set_reveal_child(false);
        _.className = mediaWidget.className.replaceAll(" reveal", "");
    });

    return mediaWidget;
}
