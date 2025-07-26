import { Wireplumber } from "./volume";
import { Windows } from "../windows";
import { restartInstance } from "./reload-handler";
import { timeout } from "ags/time";
import { Runner } from "../runner/Runner";
import { showWorkspaceNumber } from "../widget/bar/Workspaces";
import { playSystemBell } from "./utils";
import { Config } from "./config";

import AstalIO from "gi://AstalIO";
import GLib from "gi://GLib?version=2.0";
import App from "ags/gtk4/app";


let wsTimeout: (AstalIO.Time|undefined);

export function handleArguments(request: string): any {
    const args: Array<string> = GLib.shell_parse_argv(request)[1]!;

    switch(args[0]) {
        case "open":
        case "close":
        case "toggle":
        case "windows":
        case "reopen":
            return handleWindowArgs(args);

        case "help":
        case "h":
            return getHelp();

        case "volume":
            return handleVolumeArgs(args);

        case "reload":
            restartInstance();
            return `Restarting instance with name: ${App.instanceName ?? "astal"}`;
        
        case "runner":
            !Runner.instance ? 
                Runner.openDefault(args[1] || undefined)
            : Runner.close();

            return `Opening runner${args[1] ? ` with predefined text: "${args[1]}"` : ""}`;

        case "peek-workspace-num":
            if(wsTimeout) 
                return "Workspace numbers are already showing";

            showWorkspaceNumber(true);
            wsTimeout = timeout(Number.parseInt(args[1]) || 2200, () => {
                showWorkspaceNumber(false);
                wsTimeout = undefined;
            });
            return "Toggled workspace numbers";

        default:
            return "Error: command not found! try checking help";
    }
}

function handleWindowArgs(args: Array<string>): string {
    switch(args[0]) {
        case "reopen":
            Windows.getDefault().reopen();
            return "Reopening all open windows";

        case "windows":
            return Object.keys(Windows.getDefault().windows).map(name =>
                `${name}: ${Windows.getDefault().isOpen(name) ? "open" : "closed" }`).join('\n');
    }

    const specifiedWindow: string = args[1];

    if(!specifiedWindow) 
        return "Error: window argument not specified!";

    if(!Windows.getDefault().hasWindow(specifiedWindow)) 
        return `Error: "${specifiedWindow}" not found on window list! Make sure to add new windows to the system before using them`;

    switch(args[0]) {
        case "open":
            if(!Windows.getDefault().isOpen(specifiedWindow)) {
                Windows.getDefault().open(specifiedWindow);
                return `Opening window with name "${args[1]}"`;
            }

            return `Window is already open, ignored`;

        case "close":
            if(Windows.getDefault().isOpen(specifiedWindow)) {
                Windows.getDefault().close(specifiedWindow);
                return `Closing window with name "${args[1]}"`;
            }

            return `Window is already closed, ignored`;

        case "toggle":
            if(!Windows.getDefault().isOpen(specifiedWindow)) {
                Windows.getDefault().open(specifiedWindow);
                return `Toggle opening window "${args[1]}"`;
            }

            Windows.getDefault().close(specifiedWindow);
            return `Toggle closing window "${args[1]}"`;
    }

    return "Couldn't handle window management arguments";
}

function handleVolumeArgs(args: Array<string>) {
    if(!args[1]) 
        return `Please specify what you want to do!\n\n${volumeHelp()}`;

    if(/^(sink|source)(\-increase|\-decrease|\-set)$/.test(args[1]) && !args[2])
        return `You forgot to add a value to be set!`;

    if(Number.isNaN(Number.parseFloat(args[2])) && Number.isSafeInteger(Number.parseFloat(args[2]))) 
        return `Argument "${args[2]} is not a valid number! Please use integers"`;

    const command: Array<string> = args[1].split('-');

    if(args[1] === "help")
        return volumeHelp();

    switch(command[1]) {
        case "set":
            command[0] === "sink" ? 
                Wireplumber.getDefault().setSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().setSourceVolume(Number.parseInt(args[2]))
            return `Done! Set ${command[0]} volume to ${args[2]}`;

        case "mute":
            command[0] === "sink" ? 
                Wireplumber.getDefault().toggleMuteSink()
            : Wireplumber.getDefault().toggleMuteSource()

            return `Done toggling mute!`;

        case "increase":
            command[0] === "sink" ?
                Wireplumber.getDefault().increaseSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().increaseSourceVolume(Number.parseInt(args[2]))

            Config.getDefault().getProperty("misc.play_bell_on_volume_change", "boolean") === true &&
                playSystemBell();

            return `Done increasing volume by ${args[2]}`;

        case "decrease":
            command[0] === "sink" ?
                Wireplumber.getDefault().decreaseSinkVolume(Number.parseInt(args[2]))
            : Wireplumber.getDefault().decreaseSourceVolume(Number.parseInt(args[2]))

            Config.getDefault().getProperty("misc.play_bell_on_volume_change", "boolean") === true &&
                playSystemBell();

            return `Done decreasing volume to ${args[2]}`;
    }

    return `Couldn't resolve arguments! "${args.join(' ').replace(new RegExp(`^${args[0]}`), "")}"`;

    function volumeHelp(): string {
        return `
Control speaker and microphone volumes
Options:
  (sink|source)-set [number]: set speaker/microphone volume.
  (sink|source)-mute: toggle mute for the speaker/microphone device.
  (sink|source)-increase [number]: increases speaker/microphone volume.
  (sink|source)-decrease [number]: decreases speaker/microphone volume.
`.trim();
    }
}

function getHelp(): string {
    return `Manage Astal Windows and do more stuff. From retrozinndev's colorshell, 
made using Astal Libraries, AGS and Gnim by Aylur.

        Window Management:
          open [window]: opens the specified window.
          close [window]: closes all instances of specified window.
          toggle [window]: toggle-open/close the specified window.
          windows: list shell windows and their respective status.
          reload: quit this instance and start a new one.
          reopen: restart all open-windows.

        Audio Controls:
          volume: speaker and microphone volume controller, see "volume help".
        
        Other options:
          runner [initial_text]: open the application runner, optionally add an initial search.
          peek-workspace-num [millis]: peek the workspace numbers on bar window.
          h, help: shows this help message.

        2025 (c) retrozinndev's colorshell, licensed under the MIT License.
        https://github.com/retrozinndev/colorshell
    `.split('\n').map(l => l.replace(/^ {8}/, "")).join('\n');
}
