import { Gtk } from "astal/gtk3";
import { Windows } from "../windows";
import { restartInstance } from "./reload-handler";
import { Wireplumber } from "./volume";
import { AskPopup } from "../widget/AskPopup";
import { execAsync } from "astal";
import { startRunnerDefault } from "../runner/Runner";

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
        
        case "runner":
            startRunnerDefault();
            return "Opening runner..."

        case "test":
            return AskPopup({
                onAccept: () => execAsync("notify-send -u normal haha dumb"),
                text: "Would you accept?",
                title: "Dumb Question"
            });

        default:
            return "command not found! try checking help";
    }
}

// Didn't want to bloat the switch statement, so I just separated it into functions
function handleWindowArgs(args: Array<string>): string {
    const specifiedWindow: (Gtk.Window|undefined) = Windows.getWindow(args[1]);

    if(!specifiedWindow) 
        return "Window argument not specified!";

    if(!Windows.getList().has(args[1])) 
        return `Name "${args[1]}" not found windows map! Make sure to add new Windows on the Map!`

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
  sink-set [number]: set sink(speaker) volume with [number], 0 to ${Wireplumber.getDefault().getMaxSinkVolume()}.
  sink-mute: toggle mute for the sink(speaker) device.
  sink-increase [number]: increases sink(speaker) volume with [number].
  sink-decrease [number]: decreases sink(speaker) volume with [number].
  source-set [number]: set source(microphone) volume with [number], 0 to ${Wireplumber.getDefault().getMaxSourceVolume()}.
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
  reload: creates a new astal instance and removes this one.
  volume: wireplumber volume controller, see "volume help".
  runner: open the application runner.
  help, -h, --help: shows this help message.

2025 (c) retrozinndev's Hyprland-Dots, licensed under the MIT License.
https://github.com/retrozinndev/Hyprland-Dots
`.trim();
}
