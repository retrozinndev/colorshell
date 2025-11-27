import { Cli } from "..";
import { Wireplumber } from "../../modules/volume";


type DeviceType = "sink"|"source";
let device: DeviceType|undefined;

export default {
    prefix: "volume",
    onCalled: () => device = undefined,
    help: `\
Control speaker and microphone volume levels.

Extra help: 
  sink is the default speaker and source is the default microphone.

Arguments:
  --device, -d [sink/source]: set the device to be controlled.
  --set, -s [number]: set speaker/microphone volume.
  --increase, -p [number]: increases speaker/microphone volume.
  --decrease, -m [number]: decreases speaker/microphone volume.

Commands:
  mute: toggle mute for the speaker/microphone device.`,

    arguments: [
        {
            name: "device",
            alias: 'd',
            help: "Specify the device to control. Can be \"sink\" or \"source\"",
            hasValue: true,
            onCalled: (print, value) => {
                if(!value || !/sink|source/.test(value)) {
                    print({
                        content: `Device ${value} does not exist/isn't defined`,
                        type: "err"
                    });
                    return;
                }

                device = value as DeviceType;
            }
        }, {
            name: "increase",
            alias: 'p',
            hasValue: true,
            help: "increase volume/sensitivity the provided device",
            onCalled: (print, value) => {
                if(!device || value === undefined) return;
                const increase = Number.parseInt(value);
                if(Number.isNaN(increase)) {
                    print({
                        content: "Provided value is not a number/percentage!",
                        type: "err"
                    });
                    return;
                }

                print({
                    content: `Increasing volume of ${device} by ${value}`,
                    type: "out"
                });
                if(device === "sink") {
                    Wireplumber.getDefault().increaseSinkVolume(increase);
                    return;
                }

                Wireplumber.getDefault().increaseSourceVolume(increase);
            }
        }, {
            name: "decrease",
            alias: 'm',
            help: "decrease volume/sensitivity of a sink/source",
            hasValue: true,
            onCalled: (print, value) => {
                if(!device || value === undefined) return;
                const decrease = Number.parseInt(value);
                if(Number.isNaN(decrease)) {
                    print({
                        content: "Provided value is not a number/percentage!",
                        type: "err"
                    });
                    return;
                }

                print({
                    content: `Decreasing volume of ${device} by ${value}`,
                    type: "out"
                });
                if(device === "sink") {
                    Wireplumber.getDefault().decreaseSinkVolume(decrease);
                    return;
                }

                Wireplumber.getDefault().decreaseSourceVolume(decrease);
            }
        }, {
            name: "set",
            alias: 's',
            help: "set the volume/sensitivity of a sink/source",
            hasValue: true,
            onCalled: (print, value) => {
                if(!device || value === undefined) return;
                const volume = Number.parseInt(value);
                if(Number.isNaN(volume)) {
                    print({
                        content: "Provided value is not a number!",
                        type: "err"
                    });
                    return;
                }

                print({
                    content: `Setting volume of ${device} by ${value}`,
                    type: "out"
                });
                if(device === "sink") {
                    Wireplumber.getDefault().setSinkVolume(volume);
                    return;
                }

                Wireplumber.getDefault().setSourceVolume(volume);
            }
        }
    ],
    commands: [{
        name: "mute",
        help: "toggle-mute a sink/source's audio",
        onCalled: (print) => {
            if(!device) return;

            print({
                content: `Toggling mute for ${device}`,
                type: "out"
            });
            if(device === "sink") {
                Wireplumber.getDefault().toggleMuteSink();
                return;
            }

            Wireplumber.getDefault().toggleMuteSource();
        }
    }]
} satisfies Cli.Module;
