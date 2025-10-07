import { Cli } from "..";


export default {
    prefix: "volume",
    help: "manage audio device volume/sensitivity. available devices are sink(speaker) and source(microphone).\
example usage: `colorshell volume increase sink 5%`",
    commands: [
        {
            name: "increase",
            help: "increase volume/sensitivity of a sink/source",
            onCalled: () => "TODO"
        }, {
            name: "decrease",
            help: "decrease volume/sensitivity of a sink/source",
            onCalled: () => "TODO"
        }, {
            name: "set",
            help: "set the volume/sensitivity of a sink/source",
            onCalled: () => "TODO"
        }, {
            name: "mute",
            help: "toggle-mute a sink/source's audio",
            onCalled: () => "TODO"
        }
    ]
} satisfies Cli.Module;
