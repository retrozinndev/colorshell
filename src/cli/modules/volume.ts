import Cli from "..";
import { Wireplumber } from "../../modules/volume";


type DeviceType = "sink"|"source";
let device: DeviceType|undefined;

export default {
    prefix: "volume",
    onCalled: () => device = undefined,
    help: `\
Control speaker and microphone volume levels.

Extra help: 
  "sink" is the default speaker and "source" is the default microphone.

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
            onCalled: (remote, value) => {
                if(!value || !/sink|source/.test(value)) {
                    remote.println(`Device ${value} does not exist/isn't defined`, true);
                    return;
                }

                device = value as DeviceType;
            }
        }, {
            name: "increase",
            alias: 'p',
            hasValue: true,
            help: "increase volume/sensitivity the provided device",
            onCalled: (remote, value) => {
                if(!device || value === undefined) return;
                const increase = Number.parseInt(value);
                if(Number.isNaN(increase)) {
                    remote.println("Provided value is not a number/percentage!", true);
                    return;
                }

                remote.println(`Increasing volume of ${device} by ${value}`);
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
            onCalled: (remote, value) => {
                if(!device || value === undefined) return;
                const decrease = Number.parseInt(value);
                if(Number.isNaN(decrease)) {
                    remote.println("Provided value is not a number/percentage!", true);
                    return;
                }

                remote.println(`Decreasing volume of ${device} by ${value}`,);
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
            onCalled: (remote, value) => {
                if(!device || value === undefined) return;
                const volume = Number.parseInt(value);
                if(Number.isNaN(volume)) {
                    remote.println("Provided value is not a number!", true);
                    return;
                }

                remote.println(`Setting volume of ${device} by ${value}`);
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
        onCalled: (remote) => {
            if(!device) return;

            remote.println(`Toggling mute for ${device}`);
            if(device === "sink") {
                Wireplumber.getDefault().toggleMuteSink();
                return;
            }

            Wireplumber.getDefault().toggleMuteSource();
        }
    }]
} satisfies Cli.Module;
