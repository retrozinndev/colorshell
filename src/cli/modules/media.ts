import { Cli } from "..";


export default {
    prefix: "media",
    help: "manage colorshell's active player",
    commands: [
        {
            name: "play",
            help: "resume/start active player's media",
            onCalled: () => "TODO"
        }, {
            name: "pause",
            help: "pause the active player",
            onCalled: () => "TODO"
        }, {
            name: "play-pause",
            help: "toggle pause/resume the active player",
            onCalled: () => "TODO"
        }, {
            name: "stop",
            help: "stop the active player (if compatible)",
            onCalled: () => "TODO"
        }, {
            name: "previous",
            help: "go back to previous media in the active player",
            onCalled: () => "TODO"
        }, {
            name: "next",
            help: "jump to the next media in active player",
            onCalled: () => "TODO"
        }, {
            name: "bus-name",
            help: "retrieve the active player's mpris bus name",
            onCalled: () => "TODO"
        }, {
            name: "list",
            help: "list available players implementing mpris",
            onCalled: () => "TODO"
        }, {
            name: "select",
            help: "resume/start active player's media",
            onCalled: (_, busName) => "TODO"
        }
    ]
} satisfies Cli.Module;
