import AstalMpris from "gi://AstalMpris?version=0.1";
import { Cli } from "..";
import Media from "../../modules/media";


export default {
    prefix: "media",
    help: `\
Manage colorshell's active player

Arguments:
  --select, -s [bus_name]: set new active player by its bus name.

Commands: 
  play: resume/start active player's media.
  pause: pause the active player.
  play-pause: toggle play/pause on active player.
  stop: stop the active player's media.
  previous: go back to previous media if player supports it.
  next: jump to next media if player supports it.
  bus-name: get active player's mpris bus name.
  list: show available players with their bus name.
  select bus_name: change the active player, where bus_name is 
    the desired player's mpris bus name(with the mediaplayer2 prefix).`,
    arguments: [{
        name: "select",
        alias: "s",
        hasValue: true,
        help: "select a new active player by its bus name",
        onCalled: (print, name) => {
            const player = AstalMpris.get_default().players
                .filter(p => p.available && p.busName === name)[0];

            if(!player || player.available) {
                print({
                    content: `Error: no such available player with bus name "${name}" was found`,
                    type: "err"
                });
                return;
            }

            Media.getDefault().player = player;
            print({
                content: "Done setting active player",
                type: "out"
            });
        }
    }],
    commands: [
        {
            name: "play",
            help: "resume/start active player's media",
            onCalled: (print) => {
                if(!Media.getDefault().player.available ||
                   !Media.getDefault().player.canPlay)
                    return;

                Media.getDefault().player.play();
                print({
                    content: "Now playing",
                    type: "out"
                });
            }
        }, {
            name: "pause",
            help: "pause the active player",
            onCalled: (print) => {
                if(!Media.getDefault().player.available ||
                   !Media.getDefault().player.canPause)
                    return;

                Media.getDefault().player.pause();
                print({
                    content: "Paused",
                    type: "out"
                });
            }
        }, {
            name: "play-pause",
            help: "toggle pause/resume the active player",
            onCalled: (print) => {
                if(!Media.getDefault().player.available ||
                   !Media.getDefault().player.canControl)
                    return;

                Media.getDefault().player.play_pause();
                print({
                    content: Media.getDefault().player
                      .playbackStatus === AstalMpris.PlaybackStatus.PAUSED ?
                        "Toggle pause"
                    : "Toggle play",
                    type: "out"
                });
            }
        }, {
            name: "stop",
            help: "stop the active player (if compatible)",
            onCalled: (print) => {
                if(!Media.getDefault().player.available ||
                   !Media.getDefault().player.canControl)
                    return;

                Media.getDefault().player.stop();
                print({
                    content: "Stopped",
                    type: "out"
                });
            }
        }, {
            name: "previous",
            help: "go back to previous media in the active player",
            onCalled: (print) => {
                if(!Media.getDefault().player.available ||
                   !Media.getDefault().player.canGoPrevious)
                    return;

                Media.getDefault().player.previous();
                print({
                    content: "Back to previous",
                    type: "out"
                });
            }
        }, {
            name: "next",
            help: "jump to the next media in active player",
            onCalled: (print) => {
                if(!Media.getDefault().player.available ||
                   !Media.getDefault().player.canGoNext)
                    return;

                Media.getDefault().player.next();
                print({
                    content: "Jump to next",
                    type: "out"
                });
            }
        }, {
            name: "bus-name",
            help: "retrieve the active player's mpris bus name",
            onCalled: (print) => {
                if(!Media.getDefault().player.available)
                    return;

                print({
                    content: Media.getDefault().player.busName,
                    type: "out"
                });
            }
        }, {
            name: "list",
            help: "list available players implementing mpris",
            onCalled: (print) => {
                const players = AstalMpris.get_default().players
                    .filter(p => p.available);

                print({
                    content: `Available players:\n${players.map(pl => {
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
                    }).join('\n')}`,
                    type: "out"
                });
            }
        }
    ]
} satisfies Cli.Module;
