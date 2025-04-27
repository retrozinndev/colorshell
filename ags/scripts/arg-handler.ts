import { Wireplumber } from "./volume";
import { Windows } from "../windows";

import { restartInstance } from "./reload-handler";
import { runnerInstance, startRunnerDefault } from "../runner/Runner";
import { showWorkspaceNumbers } from "../widget/bar/Workspaces";
import { timeout } from "astal";


export function handleArguments(request: string): any {
    const args: Array<string> = request.split(" ");
    switch(args[0]) {
        case "open":
        case "close":
        case "toggle":
            return handleWindowArgs(args);

        case "help":
        case "h":
            return getHelp(); // stop it, get some help

        case "volume":
            return handleVolumeArgs(args);

        case "reload":
            restartInstance();
            return "Restarting instance..."

        case "windows":
            return Object.keys(Windows.windows).map(name =>
                `${name}: ${Windows.isVisible(name) ? "open" : "closed" }`).join('\n');
        
        case "runner":
            !runnerInstance ? 
                startRunnerDefault(args[1] || undefined)
            : runnerInstance.close();
            return "Opening runner..."

        case "show-ws-numbers":
            if(!showWorkspaceNumbers.get()) {
                showWorkspaceNumbers.set(true);
                timeout(2200, () => showWorkspaceNumbers.set(false));
            }
            return "Showing numbers";

        default:
            return "command not found! try checking help";
    }
}

// Didn't want to bloat the switch statement, so I just separated it into functions
function handleWindowArgs(args: Array<string>): string {
    if(!args[1]) 
        return "Window argument not specified!";

    const specifiedWindow: string = args[1];

    if(!Windows.hasWindow(specifiedWindow)) 
        return `Name "${specifiedWindow}" not found windows map! Make sure to add new Windows on the Map!`

    switch(args[0]) {
        case "open":
            if(!Windows.isVisible(specifiedWindow)) {
                Windows.open(specifiedWindow);
                return `Setting visibility of window "${args[1]}" to true`;
            }

            return `Window is already open, ignored`;

        case "close":
            if(Windows.isVisible(specifiedWindow)) {
                Windows.close(specifiedWindow);
                return `Setting visibility of window "${args[1]}" to false`
            }

            return `Window is already closed, ignored`

        case "toggle":
            if(!Windows.isVisible(specifiedWindow)) {
                Windows.open(specifiedWindow);
                return `Toggle opening window "${args[1]}"`;
            }

            Windows.close(specifiedWindow);
            return `Toggle closing window "${args[1]}"`
    }

    return "Couldn't handle window management arguments"
}

function handleVolumeArgs(args: Array<string>) {
    if(!args[1]) 
        return `Please specify what you want to do!\n\n${volumeHelp()}`

    if(/^(sink|source)(\-increase|\-decrease|\-set)$/.test(args[1]) && !args[2])
        return `You forgot to add a value to be set!`;

    if(Number.isNaN(Number.parseFloat(args[2])) && Number.isSafeInteger(Number.parseFloat(args[2]))) 
        return `Argument "${args[2]} is not a valid number! Please use integers"`;

    const command: Array<string> = args[1].split('-');

    if(/help/.test(args[1]))
        return volumeHelp();

    switch(command[1]) {
        case "set":
            command[0] === "sink" ? 
                Wireplumber.getDefault().setSinkVolume(Number.parseInt(args[2]))
            :
                Wireplumber.getDefault().setSourceVolume(Number.parseInt(args[2]))
            return `Done! Set ${command[0]} volume to ${args[2]}`;

        case "mute":
            command[0] === "sink" ? 
                Wireplumber.getDefault().toggleMuteSink()
            :
                Wireplumber.getDefault().toggleMuteSource()
            return `Done toggling mute!`;

        case "increase":
            command[0] === "sink" ?
                Wireplumber.getDefault().increaseSinkVolume(Number.parseInt(args[2]))
            : 
                Wireplumber.getDefault().increaseSourceVolume(Number.parseInt(args[2]))

            return `Done increasing volume by ${args[2]}`;

        case "decrease":
            command[0] === "sink" ?
                Wireplumber.getDefault().decreaseSinkVolume(Number.parseInt(args[2]))
            : 
                Wireplumber.getDefault().decreaseSourceVolume(Number.parseInt(args[2]))

            return `Done decreasing volume to ${args[2]}`;
    }

    return `Couldn't resolve arguments! "${args.join(' ').replace(new RegExp(`^${args[0]}`), "")}"`;

    function volumeHelp(): string {
        return `
Control speaker and microphone volumes easily!
Options:
  sink-set [number]: set sink(speaker) volume with [number], 0 to ${Wireplumber.getDefault().getMaxSinkVolume() || 100}.
  sink-mute: toggle mute for the sink(speaker) device.
  sink-increase [number]: increases sink(speaker) volume with [number].
  sink-decrease [number]: decreases sink(speaker) volume with [number].
  source-set [number]: set source(microphone) volume with [number], 0 to ${Wireplumber.getDefault().getMaxSourceVolume() || 100}.
  source-mute: toggle mute for the source(microphone) device.
  source-increase [number]: increases source(microphone) volume with [number].
  source-decrease [number]: decreases source(microphone) volume with [number]
`.trim();
    }
}

function getHelp(): string {
    return `
Manage Astal Windows and do more stuff. From
retrozinndev's Hyprland Dots, using Astal and AGS by Aylur.

Options:
  open [window_name]: sets specified window's visibility to true.
  close [window_name]: sets specified window's visibility to false.
  toggle [window_name]: toggles visibility of specified window.
  windows: shows available windows to control.
  reload: creates a new astal instance and removes this one.
  volume: wireplumber volume controller, see "volume help".
  runner: open the application runner.
  show-ws-numbers: show or hide workspace numbers in bar.
  h, help: shows this help message.

2025 (c) retrozinndev's Hyprland-Dots, licensed under the MIT License.
https://github.com/retrozinndev/Hyprland-Dots
`.trim();
}
