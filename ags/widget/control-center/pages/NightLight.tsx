import { Page } from "./Page";
import { NightLight } from "../../../scripts/nightlight";
import { tr } from "../../../i18n/intl";
import { Astal, Gtk } from "ags/gtk4";
import { addSliderMarksFromMinMax } from "../../../scripts/utils";
import { createBinding } from "ags";

export const PageNightLight: (() => Page) = () => 
    <Page id={"night-light"} title={tr("control_center.pages.night_light.title")}
      description={tr("control_center.pages.night_light.description")}
      class={"night-light"}>

        <Gtk.Label class={"sub-header"} label={tr(
            "control_center.pages.night_light.temperature"
        )} xalign={0} />
        <Astal.Slider class={"temperature"} $={(self) => {
              self.value = NightLight.getDefault().temperature;
              addSliderMarksFromMinMax(self, 5, "{}K");
          }} value={createBinding(NightLight.getDefault(), "temperature")}
          tooltipText={createBinding(NightLight.getDefault(), "temperature").as(temp => 
              `${temp}K`)} min={NightLight.getDefault().minTemperature} 
          max={NightLight.getDefault().maxTemperature} 
          onChangeValue={(_, type, value) => {
              if(type != undefined && type !== null)
                  NightLight.getDefault().temperature = Math.floor(value)
          }}
        />
        <Gtk.Label class={"sub-header"} label={tr(
            "control_center.pages.night_light.gamma"
        )} xalign={0} />
        <Astal.Slider class={"gamma"} $={(self) => {
              self.value = NightLight.getDefault().gamma;
              addSliderMarksFromMinMax(self, 5, "{}%");
          }} value={createBinding(NightLight.getDefault(), "gamma")}
          tooltipText={createBinding(NightLight.getDefault(), "gamma").as(gamma => 
              `${gamma}%`)} max={NightLight.getDefault().maxGamma} 
          onChangeValue={(_, type, value) => {
              if(type != undefined && type !== null)
                  NightLight.getDefault().gamma = Math.floor(value)
          }}
        />
    </Page> as Page;
