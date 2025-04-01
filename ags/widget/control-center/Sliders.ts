import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../../scripts/volume";

export const Sliders = () => new Widget.Box({
    className: "sliders",
    orientation: Gtk.Orientation.VERTICAL,
    expand: true,
    children: [
        new Widget.Box({
            className: "sink speaker",
            children: [
                new Widget.Label({
                    className: "nf icon",
                    label: "󰕾"
                } as Widget.LabelProps),
                new Widget.Slider({
                    drawValue: false,
                    hexpand: true,
                    setup: (slider) => slider.set_value(Wireplumber.getDefault().getSinkVolume()),
                    value: bind(Wireplumber.getDefault().getDefaultSink(), "volume").as((volume: number) => 
                        Math.floor(volume * 100)),
                    max: Wireplumber.getDefault().getMaxSinkVolume(),
                    onDragged: (slider: Gtk.Scale) => Wireplumber.getDefault().setSinkVolume(slider.get_value())
                } as Widget.SliderProps)
            ]
        } as Widget.BoxProps),
        new Widget.Box({
            className: "source microphone",
            children: [
                new Widget.Label({
                    className: "nf icon",
                    label: "󰍬"
                } as Widget.LabelProps),
                new Widget.Slider({
                    drawValue: false,
                    hexpand: true,
                    setup: (slider) => slider.set_value(Wireplumber.getDefault().getSourceVolume()),
                    value: bind(Wireplumber.getDefault().getDefaultSource(), "volume").as((volume: number) => 
                        Math.floor(volume * 100)),
                    max: Wireplumber.getDefault().getMaxSourceVolume(),
                    onDragged: (slider: Gtk.Scale) => Wireplumber.getDefault().setSourceVolume(slider.get_value())
                } as Widget.SliderProps)
            ]
        } as Widget.BoxProps),
        /*new Widget.Box({
            className: "brightness",
            children: [
                new Widget.Label({
                    className: "icon nf",
                    label: "󰃠"
                } as Widget.LabelProps),
                new Widget.Slider({
                    drawValue: false,
                    hexpand: true,
                    value: 216,
                    max: 255
                } as Widget.SliderProps)
            ]
        } as Widget.BoxProps)*/
    ]
} as Widget.BoxProps);
