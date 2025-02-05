import { bind, Process } from "astal";
import { Widget } from "astal/gtk3";
import AstalWp from "gi://AstalWp?version=0.1";
import { Wireplumber } from "../../scripts/volume";

const wp = AstalWp.get_default();

export function Audio() {
    return wp && new Widget.EventBox({
        className: "audio",
        onClick: () => Process.exec_async("astal toggle control-center", () => {}),
        child: new Widget.Box({
            children: [
                new Widget.EventBox({
                    className: "sink",
                    onScroll: (_, event) => 
                        event.delta_y > 0 ? 
                            Wireplumber.getDefault().decreaseSinkVolume(5)
                        :
                            Wireplumber.getDefault().increaseSinkVolume(5),
                    child: new Widget.Box({
                        children: [
                            new Widget.Label({
                                className: "icon nf",
                                label: "󰕾"
                            } as Widget.LabelProps),
                            new Widget.Label({
                                className: "icon nf",
                                label: bind(wp!.defaultSpeaker, "volume").as((volume: number) => 
                                    Math.round(volume * 100).toString() + "%")
                            } as Widget.LabelProps)
                       ]
                    })
                } as Widget.EventBoxProps),
                new Widget.EventBox({
                    className: "source",
                    onScroll: (_, event) => 
                        event.delta_y > 0 ?
                            Wireplumber.getDefault().decreaseSourceVolume(5)
                        :
                            Wireplumber.getDefault().increaseSourceVolume(5),
                    child: new Widget.Box({
                        children: [
                            new Widget.Label({
                                className: "icon",
                                label: "󰍬"
                            } as Widget.LabelProps),
                            new Widget.Label({
                                label: bind(wp!.defaultMicrophone, "volume").as((volume: number) => 
                                    Math.round(volume * 100).toString() + "%")
                            } as Widget.LabelProps)
                        ]
                    })
                } as Widget.EventBoxProps)
            ]
        } as Widget.BoxProps)
    } as Widget.EventBoxProps);
}
