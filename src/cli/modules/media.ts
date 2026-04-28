import AstalMpris from "gi://AstalMpris?version=0.1";
import Cli from "..";
import Media from "../../modules/media";


const media = {
    prefix: "media",
    help: `Change and manage active media via MPRIS.`,
    arguments: [{
        name: "select",
        alias: "s",
        hasValue: true,
        help: "select a new active player by its bus name",
        onCalled: (remote, name) => {
            const player = AstalMpris.get_default().players.find(p => 
                p.available && p.busName === name
            );

            if(!player || player.available) {
                remote.println(
                    `Error: no such available player with bus name "${name}" was found`,
                    true
                );
                remote.exit(1);
                return;
            }

            Media.getDefault().player = player;
            remote.println("Done setting active player");
        }
    }],
    commands: [
        {
            name: "play",
            help: "resume/start active player's media",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available ||
                   !Media.getDefault().player?.canPlay)
                    return;

                Media.getDefault().player?.play();
                remote.println("Now playing");
            }
        }, {
            name: "pause",
            help: "pause the active player",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available ||
                   !Media.getDefault().player?.canPause)
                    return;

                Media.getDefault().player?.pause();
                remote.println("Paused");
            }
        }, {
            name: "play-pause",
            help: "toggle pause/resume the active player",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available ||
                   !Media.getDefault().player?.canControl)
                    return;

                Media.getDefault().player?.play_pause();
                remote.println(Media.getDefault().player
                    ?.playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                        "Toggle pause"
                    : "Toggle play"
                );
            }
        }, {
            name: "stop",
            help: "stop the active player (if compatible)",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available ||
                   !Media.getDefault().player?.canControl)
                    return;

                Media.getDefault().player?.stop();
                remote.println("Stopped");
            }
        }, {
            name: "previous",
            help: "go back to previous media in the active player",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available ||
                   !Media.getDefault().player?.canGoPrevious)
                    return;

                Media.getDefault().player?.previous();
                remote.println("Back to previous");
            }
        }, {
            name: "next",
            help: "jump to the next media in active player",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available ||
                   !Media.getDefault().player?.canGoNext)
                    return;

                Media.getDefault().player?.next();
                remote.println("Jump to next");
            }
        }, {
            name: "bus-name",
            help: "retrieve the active player's mpris bus name",
            onCalled: (remote) => {
                if(!Media.getDefault().player?.available)
                    return;

                remote.println(Media.getDefault().player!.busName);
            }
        }, {
            name: "list",
            help: "list available players implementing mpris",
            onCalled: (remote) => {
                const players = AstalMpris.get_default().players
                    .filter(p => p.available);

                remote.println(`Available players:\n${players.map(pl => {
                    let playbackStatusStr: string;
                    switch(pl.playbackStatus) {
                        case AstalMpris.PlaybackStatus.PAUSED:
                            playbackStatusStr = "paused";
                        break;
                        case AstalMpris.PlaybackStatus.PLAYING:
                            playbackStatusStr = "playing";
                        break;
                        default:
                            playbackStatusStr = "stopped";
                        break;
                    }

                    return `  ${pl.busName}: ${playbackStatusStr}`;
                }).join('\n')}`);
            }
        }
    ]
} satisfies Cli.Module;

media.help = Cli.genHelp(media);

export default media;
