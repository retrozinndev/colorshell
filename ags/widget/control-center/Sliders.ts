import { bind } from "astal";
import { Gtk, Widget } from "astal/gtk3";
import { Wireplumber } from "../../scripts/volume";
import { Pages } from "./Pages";
import { PageSound } from "./pages/Sound";
import { PageMicrophone } from "./pages/Microphone";

export function Sliders() {
    const slidersPages = new Pages();

    return new Widget.Box({
        className: "sliders",
        orientation: Gtk.Orientation.VERTICAL,
        expand: true,
        children: [
            new Widget.Box({
                className: "sink speaker",
                children: bind(Wireplumber.getWireplumber(), "defaultSpeaker").as((sink) => [
                    new Widget.Button({
                        className: "nf",
                        label: bind(sink, "mute").as((muted) => !muted ? "󰕾" : "󰖁"),
                        onClick: () => Wireplumber.getDefault().toggleMuteSink()
                    } as Widget.ButtonProps),
                    new Widget.Slider({
                        drawValue: false,
                        hexpand: true,
                        setup: (slider) => slider.value = Math.floor(sink.volume * 100),
                        value: bind(sink, "volume").as((vol) => Math.floor(vol * 100)),
                        max: Wireplumber.getDefault().getMaxSinkVolume(),
                        onDragged: (slider) => sink.volume = slider.value / 100
                    } as Widget.SliderProps),
                    new Widget.Button({
                        className: "more",
                        image: new Widget.Icon({
                            icon: "go-next-symbolic",
                        } as Widget.IconProps),
                        onClick: (_) => slidersPages.toggle(PageSound())
                    } as Widget.ButtonProps)
                ])
            } as Widget.BoxProps),
            new Widget.Box({
                className: "source microphone",
                children: bind(Wireplumber.getWireplumber(), "defaultMicrophone").as((source) => [
                    new Widget.Button({
                        className: "nf",
                        label: bind(source, "mute").as((muted) => !muted ? "󰍬" : "󰍭"),
                        onClick: () => Wireplumber.getDefault().toggleMuteSource()
                    } as Widget.ButtonProps),
                    new Widget.Slider({
                        drawValue: false,
                        hexpand: true,
                        setup: (slider) => slider.set_value(Math.floor(source.volume * 100)),
                        value: bind(source, "volume").as((vol) => Math.floor(vol * 100)),
                        max: Wireplumber.getDefault().getMaxSourceVolume(),
                        onDragged: (slider) => source.volume = slider.value / 100
                    } as Widget.SliderProps),
                    new Widget.Button({
                        className: "more",
                        image: new Widget.Icon({
                            icon: "go-next-symbolic",
                        } as Widget.IconProps),
                        onClick: (_) => slidersPages.toggle(PageMicrophone())
                    } as Widget.ButtonProps)
                ])
            } as Widget.BoxProps),
            slidersPages
        ]
    } as Widget.BoxProps);
}
