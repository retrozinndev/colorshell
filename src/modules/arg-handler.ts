import { Gtk } from "ags/gtk4";
import { Wireplumber } from "./volume";
import { Windows } from "../windows";
import { restartInstance } from "./reload-handler";
import { Runner } from "../runner";
import { showWorkspaceNumber } from "../window/bar/widgets/Workspaces";
import { playSystemBell } from "./utils";
import { Shell } from "../app";
import { Screenshot } from "./screenshot";
import { generalConfig } from "../config";
import { execApp } from "./apps";
import { exec } from "ags/process";

import Media from "./media";
import AstalMpris from "gi://AstalMpris";
import GLib from "gi://GLib?version=2.0";


export type RemoteCaller = {
    printerr_literal: (message: string) => void,
    print_literal: (message: string) => void
};

let wsPeekTimeout: GLib.Source|undefined;
const help = `Manage colorshell's windows, features and get extra info.
Made using GTK4, AGS, Gnim and Astal libraries.

Window Management:
  windows: list all the available windows and their states
  reopen: close all of the currently-open windows and re-open them
  open [name]: open the window with "name"
  close [name]: close an already-open window with "name"
  toggle [name]: toggle-open a window with "name"(closes if open, opens if closed)

Audio Controls:
  volume: speaker and microphone volume controller, see "volume help"

Media Controls:
  media: manage colorshell's active player, see "media help"
${DEVEL ? `
Development Tools:
  dev: tools to help debugging colorshell
` : ""}
Others:
  runner [prefix]: open the application runner, optionally add an initial search(prefix)
  run app[.desktop] [client_modifiers]: run applications from the cli, see "run help"
  lock: quick-lock your user with hyprlock
  screenshot [full|active]: select an area to screenshot(add "full" to take a full screenshot or "active" to take from the active client)
  peek-workspace-num [millis]: peek the workspace numbers on bar window
  v, version [-r]: display current colorshell version. (optionally add "-r" to only show the raw version string)
  reload: restart current colorshell instance
  quit: exit the main instance of the shell.
  h, help: shows this help message.

2026 (c) colorshell, licensed under the BSD 3-Clause License.
https://github.com/retrozinndev/colorshell
`.trim();

export function handleArguments(cmd: RemoteCaller, args: Array<string>): number {
    switch(args[0]) {
        case "help":
        case "-help":
        case "h":
        case "-h":
            cmd.print_literal(help);
            return 0;

        case "version":
        case "v":
            if(args[1]?.includes("-r")) {
                cmd.print_literal(COLORSHELL_VERSION);
                return 0;
            }
            cmd.print_literal(`colorshell by retrozinndev, version ${COLORSHELL_VERSION
                }${DEVEL ? " (devel)" : ""}\nhttps://github.com/retrozinndev/colorshell`);
            return 0;

        case "dev":
            return handleDevArgs(cmd, args);

        case "open":
        case "close":
        case "toggle":
        case "windows":
        case "reopen":
            return handleWindowArgs(cmd, args);

        case "volume":
            return handleVolumeArgs(cmd, args);

        case "run":
            return handleRunnerArgs(cmd, args);

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

            cmd.print_literal(`Opening runner${args[1] ? ` with prefix: "${args[1]}"` : ""}`);
            return 0;

        case "peek-workspace-num":
            if(wsPeekTimeout) {
                cmd.print_literal("Workspace numbers are already showing");
                return 0;
            }

            showWorkspaceNumber(true);
            wsPeekTimeout = setTimeout(() => {
                showWorkspaceNumber(false);
                wsPeekTimeout = undefined;
            }, Number.parseInt(args[1]) || 2200);
            cmd.print_literal("Toggled workspace numbers");
            return 0;

        case "lock":
            execApp(
                `hyprlock --config ${Shell.runtimeDir.peek_path()!}/config/hyprlock.conf`
            );
            return 0;

        case "screenshot":
            try {
                exec("killall slurp"); // kill any active selection layer
            } catch(_) {}

            if(args[1] !== undefined) {
                if(/^f(ull)?$/.test(args[1])) {
                    Screenshot.getDefault().take(Screenshot.Mode.FULL).catch(e => console.error(e));
                    return 0;
                }
                if(/^a(ctive)?$/.test(args[1])) {
                    Screenshot.getDefault().take(Screenshot.Mode.ACTIVE_WINDOW).catch(e => console.error(e));
                    return 0;
                }
            }

            Screenshot.getDefault().take().catch(e => console.error(e)); // take screenshot in default mode
            return 0;
    }

    cmd.printerr_literal("Error: command not found! try checking help");
    return 1;
}

function handleDevArgs(cmd: RemoteCaller, args: Array<string>): number {
    if(/^-?h(elp)?$/.test(args[1])) {
        cmd.print_literal(`
Debugging tools for colorshell.

Options:
  inspector: open GTK's visual debugger
`.trim());
        return 0;
    }

    switch(args[1]) {
        case "inspector":
            cmd.print_literal("Opening inspector...");
            Gtk.Window.set_interactive_debugging(true);
            return 0;
    }

    cmd.printerr_literal("Error: command not found! try checking `dev help`");
    return 1;
}

function handleRunnerArgs(cmd: RemoteCaller, args: Array<string>): number {
    const help = `\
Run applications and command aliases defined in the colorshell
configuration.

Help:
  client_modifiers: Hyprland client modifiers(e.g.: "[animation slide]")

Options:
  h, help: show this help message.

Usage:
  run %aliasName [client_modifiers]: run a command alias defined in the config.
  run appName[.desktop] [client_modifiers]: run an ordinary app(uses uwsm if available).`;

    if(/^\-?h(elp)?$/.test(args[1]?.trim())) {
        cmd.print_literal(help);
        return 0;
    }

    if(args[1].trim() === "" || args[1] === undefined) {
        cmd.printerr_literal("Error: No application/alias to run provided after \"run\"");
        return 1;
    }

    // it's an alias
    if(args[1].startsWith('%')) {
        const aliasName = args[1].replace(/^\%/, "");
        const command = generalConfig.getProperty(`aliases.${aliasName}`, "string");

        if(command !== undefined && command.trim() !== "") {
            cmd.print_literal("Executing from alias...");
            execApp(command, args[2] || undefined);
            return 0;
        }

        cmd.printerr_literal("Error: provided alias couldn't be found in the aliases list");
        return 1;
    }

    cmd.print_literal(`Executing app from ${args[1].endsWith(".desktop") ?
        "desktop entry" : "command"}...`);
    execApp(args[1], args[2] || undefined);
    return 0;
}

function handleMediaArgs(cmd: RemoteCaller, args: Array<string>): number {
    const mediaHelp = `\
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
    the desired player's mpris bus name(without the mediaplayer2 prefix).
`.trim();

    if(/^-?h(elp)?$/.test(args[1])) {
        cmd.print_literal(mediaHelp);
        return 0;
    }

    const activePlayer: AstalMpris.Player|undefined = Media.getDefault().player.available ? 
        Media.getDefault().player 
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

            Media.getDefault().player = players.filter(pl => pl.busName === args[2])[0];
            cmd.print_literal(`Done setting player to \`${args[2]}\`!`);
            return 0;
    }

    cmd.printerr_literal("Error: couldn't handle media arguments, try checking `media help`");
    return 1;
}

function handleWindowArgs(cmd: RemoteCaller, args: Array<string>): number {
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
        cmd.printerr_literal("Error: \"name\" argument not specified!");
        return 1;
    }

    if(!Windows.getDefault().hasWindow(specifiedWindow)) {
        cmd.printerr_literal(
            `Error: "${specifiedWindow}" not found in window list!`
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

            cmd.print_literal(`Window is already open! Ignored.`);
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

function handleVolumeArgs(cmd: RemoteCaller, args: Array<string>): number {
    if(!args[1]) {
        cmd.printerr_literal(`Error: please specify what to do! see \`volume help\``);
        return 1;
    }

    if(/^(sink|source)[-](increase|decrease|set)$/.test(args[1]) && !args[2]) {
        cmd.printerr_literal(`Error: you forgot to set a value`);
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

    if(command[1] === "mute") {
        command[0] === "sink" ? 
            Wireplumber.getDefault().toggleMuteSink()
        : Wireplumber.getDefault().toggleMuteSource()

        cmd.print_literal(`Done toggling mute!`);
        return 0;
    }

    if(Number.isNaN(Number.parseFloat(args[2]))) {
        cmd.printerr_literal(`Error: argument "${args[2]} is not a valid number! Please use integers"`);
        return 1;
    }

    switch(command[1]) {
        case "set":
            command[0] === "sink" ? 
                Wireplumber.getDefault().setSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().setSourceVolume(Number.parseInt(args[2]))
            cmd.print_literal(`Done! Set ${command[0]} volume to ${args[2]}`);
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
