import { Wireplumber } from "./volume";
import { Windows } from "../windows";
import { restartInstance } from "./reload-handler";
import { timeout } from "ags/time";
import { Runner } from "../runner/Runner";
import { showWorkspaceNumber } from "../widget/bar/Workspaces";
import { playSystemBell } from "./utils";
import { player, setPlayer } from "./media";
import { generalConfig, Shell } from "../app";

import AstalIO from "gi://AstalIO";
import AstalMpris from "gi://AstalMpris";
import Gio from "gi://Gio?version=2.0";


let wsTimeout: AstalIO.Time|undefined;
const help = `Manage Astal Windows and do more stuff. From retrozinndev's colorshell, \
made using GTK4, AGS, Gnim and Astal libraries by Aylur.

        Window Management:
          open [window]: opens the specified window.
          close [window]: closes all instances of specified window.
          toggle [window]: toggle-open/close the specified window.
          windows: list shell windows and their respective status.
          reload: quit this instance and start a new one.
          reopen: restart all open-windows.
          quit: exit the main instance of the shell.

        Audio Controls:
          volume: speaker and microphone volume controller, see "volume help".

        Media Controls:
          media: manage colorshell's active player, see "media help".
        
        Other options:
          runner [initial_text]: open the application runner, optionally add an initial search.
          peek-workspace-num [millis]: peek the workspace numbers on bar window.
          v, version: display current colorshell version.
          h, help: shows this help message.

        2025 (c) retrozinndev's colorshell, licensed under the MIT License.
        https://github.com/retrozinndev/colorshell
    `.split('\n').map(l => l.replace(/^ {8}/, "")).join('\n');

export function handleArguments(cmd: Gio.ApplicationCommandLine, args: Array<string>): number {
    switch(args[0]) {
        case "help":
        case "h":
            cmd.print_literal(help);
            return 0;

        case "version":
        case "v":
            cmd.print_literal(`colorshell by retrozinndev, version ${COLORSHELL_VERSION
                }${DEVEL ? "(devel)" : ""}\nhttps://github.com/retrozinndev/colorshell`);
            return 0;

        case "open":
        case "close":
        case "toggle":
        case "windows":
        case "reopen":
            return handleWindowArgs(cmd, args);

        case "volume":
            return handleVolumeArgs(cmd, args);

        case "media":
            return handleMediaArgs(cmd, args);

        case "reload":
            restartInstance();
            cmd.print_literal("Restarting instance...");
            return 0;

        case "quit":
            try {
                Shell.getDefault().quit();
                cmd.print_literal("Quitting main instance...");
            } catch(_e) {
                const e = _e as Error;
                cmd.printerr_literal(`Error: couldn't quit instance. Stderr: ${e.message}\n${e.stack}`);
                return 1;
            }
            return 0;
        
        case "runner":
            !Runner.instance ? 
                Runner.openDefault(args[1] || undefined)
            : Runner.close();

            cmd.print_literal(`Opening runner${args[1] ? ` with predefined text: "${args[1]}"` : ""}`);
            return 0;

        case "peek-workspace-num":
            if(wsTimeout) {
                cmd.print_literal("Workspace numbers are already showing");
                return 0;
            }

            showWorkspaceNumber(true);
            wsTimeout = timeout(Number.parseInt(args[1]) || 2200, () => {
                showWorkspaceNumber(false);
                wsTimeout = undefined;
            });
            cmd.print_literal("Toggled workspace numbers");
            return 0;
    }

    cmd.printerr_literal("Error: command not found! try checking help");
    return 1;
}

function handleMediaArgs(cmd: Gio.ApplicationCommandLine, args: Array<string>): number {
    if(/h|help/.test(args[1])) {
        const mediaHelp = `
Manage colorshell's active player

Options: 
  play: resume/start active player's media.
  pause: pause the active player.
  play-pause: toggle play/pause on active player.
  stop: stop the active player's media.
  previous: go back to previous media if player supports it.
  next: jump to next media if player supports it.
  bus-name: get active player's mpris bus name.
  list: show available players with their bus name.
  select bus_name: change the active player, where bus_name is 
    the desired player's mpris bus name(with the mediaplayer2 prefix).
`.trim();
        cmd.print_literal(mediaHelp);
        return 0;
    }

    const activePlayer: AstalMpris.Player|undefined = player.get().available ? 
        player.get() 
    : undefined;
    const players = AstalMpris.get_default().players.filter(pl => pl.available);

    if(!activePlayer) {
        cmd.printerr_literal(`Error: no active player found! try playing some media first`);
        return 1;
    }

    switch(args[1]) {
        case "play":
            activePlayer.play();
            cmd.print_literal("Playing");
            return 0;

        case "list":
            cmd.print_literal(`Available players:\n${players.map(pl => {
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
            return 0;

        case "pause":
            activePlayer.pause();
            cmd.print_literal("Paused");
            return 0;

        case "play-pause":
            activePlayer.play_pause();
            cmd.print_literal(
                activePlayer?.playbackStatus === AstalMpris.PlaybackStatus.PAUSED ? 
                    "Toggled play"
                : "Toggled pause"
            );
            return 0;

        case "stop":
            activePlayer.stop();
            cmd.print_literal("Stopped!");
            return 0;

        case "previous":
            activePlayer.canGoPrevious && activePlayer.previous();
            cmd.print_literal(
                activePlayer.canGoPrevious ? 
                    "Back to previous"
                : "Player does not support this command"
            );
            return 0;

        case "next":
            activePlayer.canGoNext && activePlayer.next();
            cmd.print_literal(
                activePlayer.canGoNext ? 
                    "Jump to next"
                : "Player does not support this command"
            );
            return 0;

        case "bus-name":
            cmd.print_literal(activePlayer.busName);
            return 0;

        case "select":
            if(!args[2] || !players.filter(pl => pl.busName == args[2])?.[0]) {
                cmd.printerr_literal(`Error: either no player was specified or the player with \
specified bus name does not exist/is not available!`);

                return 1;
            }

            setPlayer(players.filter(pl => pl.busName === args[2])[0]);
            cmd.print_literal(`Done setting player to \`${args[2]}\`!`);
            return 0;
    }

    cmd.printerr_literal("Error: couldn't handle media arguments, try checking `media help`");
    return 1;
}

function handleWindowArgs(cmd: Gio.ApplicationCommandLine, args: Array<string>): number {
    switch(args[0]) {
        case "reopen":
            Windows.getDefault().reopen();
            cmd.print_literal("Reopening all open windows");
            return 0;

        case "windows":
            cmd.print_literal(
                Object.keys(Windows.getDefault().windows).map(name =>
                    `${name}: ${Windows.getDefault().isOpen(name) ? 
                        "open"
                    : "closed"}`
                ).join('\n')
            );  
            return 0;
    }

    const specifiedWindow: string = args[1];

    if(!specifiedWindow) {
        cmd.printerr_literal("Error: window argument not specified!");
        return 1;
    }

    if(!Windows.getDefault().hasWindow(specifiedWindow)) {
        cmd.printerr_literal(
            `Error: "${specifiedWindow}" not found on window list! Make sure to add new windows to the system before using them`
        );
        return 1;
    }

    switch(args[0]) {
        case "open":
            if(!Windows.getDefault().isOpen(specifiedWindow)) {
                Windows.getDefault().open(specifiedWindow);
                cmd.print_literal(`Opening window with name "${args[1]}"`);
                return 0;
            }

            cmd.print_literal(`Window is already open, ignored`);
            return 0;

        case "close":
            if(Windows.getDefault().isOpen(specifiedWindow)) {
                Windows.getDefault().close(specifiedWindow);
                cmd.print_literal(`Closing window with name "${args[1]}"`);
                return 0;
            }

            cmd.print_literal(`Window is already closed, ignored`);
            return 0;

        case "toggle":
            if(!Windows.getDefault().isOpen(specifiedWindow)) {
                Windows.getDefault().open(specifiedWindow);
                cmd.print_literal(`Toggle opening window "${args[1]}"`);
                return 0;
            }

            Windows.getDefault().close(specifiedWindow);
            cmd.print_literal(`Toggle closing window "${args[1]}"`);
            return 0;
    }

    cmd.printerr_literal("Couldn't handle window management arguments");
    return 1;
}

function handleVolumeArgs(cmd: Gio.ApplicationCommandLine, args: Array<string>): number {
    if(!args[1]) {
        cmd.printerr_literal(`Error: please specify what to do! see \`volume help\``);
        return 1;
    }

    if(/^(sink|source)[-](increase|decrease|set)$/.test(args[1]) && !args[2]) {
        cmd.printerr_literal(`Error: you forgot to set a value`);
        return 1;
    }

    if(Number.isNaN(Number.parseFloat(args[2]))) {
        cmd.printerr_literal(`Error: argument "${args[2]} is not a valid number! Please use integers"`);
        return 1;
    }

    const command: Array<string> = args[1].split('-');

    if(/h|help/.test(args[1])) {
         cmd.print_literal(`
Control speaker and microphone volumes
Options:
  (sink|source)-set [number]: set speaker/microphone volume.
  (sink|source)-mute: toggle mute for the speaker/microphone device.
  (sink|source)-increase [number]: increases speaker/microphone volume.
  (sink|source)-decrease [number]: decreases speaker/microphone volume.
`.trim());
        
        return 0;
    }

    switch(command[1]) {
        case "set":
            command[0] === "sink" ? 
                Wireplumber.getDefault().setSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().setSourceVolume(Number.parseInt(args[2]))
            cmd.print_literal(`Done! Set ${command[0]} volume to ${args[2]}`);
            return 0;

        case "mute":
            command[0] === "sink" ? 
                Wireplumber.getDefault().toggleMuteSink()
            : Wireplumber.getDefault().toggleMuteSource()

            cmd.print_literal(`Done toggling mute!`);
            return 0;

        case "increase":
            command[0] === "sink" ?
                Wireplumber.getDefault().increaseSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().increaseSourceVolume(Number.parseInt(args[2]))

            generalConfig.getProperty("misc.play_bell_on_volume_change", "boolean") === true &&
                playSystemBell();

            cmd.print_literal(`Done increasing volume by ${args[2]}`);
            return 0;

        case "decrease":
            command[0] === "sink" ?
                Wireplumber.getDefault().decreaseSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().decreaseSourceVolume(Number.parseInt(args[2]))

            generalConfig.getProperty("misc.play_bell_on_volume_change", "boolean") === true &&
                playSystemBell();

            cmd.print_literal(`Done decreasing volume to ${args[2]}`);
            return 0;
    }

    cmd.printerr_literal(`Error: couldn't resolve arguments! "${args.join(' ')
        .replace(new RegExp(`^${args[0]}`), "")}"`);

    return 1;
}
