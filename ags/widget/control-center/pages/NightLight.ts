import { Widget } from "astal/gtk3";
import { Page, PageProps } from "./Page";
import { bind } from "astal";
import { NightLight } from "../../../scripts/nightlight";
import { addSliderMarksFromMinMax } from "../../../scripts/widget-utils";
import { tr } from "../../../i18n/intl";

export const PageNightLight: (() => Page) = () => new Page({
    id: "night-light",
    title: tr("control_center.pages.night_light.title"),
    description: tr("control_center.pages.night_light.description"),
    className: "night-light",
    children: [
        new Widget.Label({
            className: "sub-header",
            label: tr("control_center.pages.night_light.temperature"),
            xalign: 0
        } as Widget.LabelProps),
        new Widget.Slider({
            className: "temperature",
            setup: (slider) => {
                slider.value = NightLight.getDefault().temperature;
                addSliderMarksFromMinMax(slider, 5, "{}K");
            },
            value: bind(NightLight.getDefault(), "temperature"),
            tooltipText: bind(NightLight.getDefault(), "temperature").as((temp) => `${temp}K`),
            min: 1000,
            max: bind(NightLight.getDefault(), "maxTemperature"),
            onDragged: (slider) => 
                NightLight.getDefault().temperature = (Math.floor(slider.value)),
        } as Widget.SliderProps),
        new Widget.Label({
            className: "sub-header",
            label: tr("control_center.pages.night_light.gamma"),
            css: "margin-top: 6px;",
            xalign: 0
        } as Widget.LabelProps),
        new Widget.Slider({
            className: "gamma",
            setup: (slider) => {
                slider.value = NightLight.getDefault().gamma;
                addSliderMarksFromMinMax(slider, 5, "{}%");
            },
            value: bind(NightLight.getDefault(), "gamma"),
            max: bind(NightLight.getDefault(), "maxGamma"),
            tooltipText: bind(NightLight.getDefault(), "gamma").as((gamma) => `${gamma}%`),
            onDragged: (slider) => 
                NightLight.getDefault().gamma = (Math.floor(slider.value)),
        } as Widget.SliderProps)
    ]
} as PageProps);
