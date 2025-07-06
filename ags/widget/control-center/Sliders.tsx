import { Astal, Gtk } from "ags/gtk4";
import { Wireplumber } from "../../scripts/volume";
import { Pages } from "./Pages";
import { PageSound } from "./pages/Sound";
import { PageMicrophone } from "./pages/Microphone";
import { createBinding, With } from "ags";
import AstalWp from "gi://AstalWp";


export function Sliders() {
    const slidersPages = <Pages /> as Pages;

    return <Gtk.Box class={"sliders"} orientation={Gtk.Orientation.VERTICAL} 
      hexpand={true} spacing={10}>

        <With value={createBinding(Wireplumber.getWireplumber(), "defaultSpeaker")}>
            {(sink: AstalWp.Endpoint) => <Gtk.Box class={"sink speaker"} spacing={3}>
                <Gtk.Button onClicked={Wireplumber.getDefault().toggleMuteSink}
                    iconName={createBinding(sink, "volumeIcon").as((icon) => 
                        (!Wireplumber.getDefault().isMutedSink() && 
                            Wireplumber.getDefault().getSinkVolume() > 0) ? 
                                icon
                            : "audio-volume-muted-symbolic"
                )} />

                <Astal.Slider drawValue={false} hexpand={true} 
                  $={(self) => self.value = Math.floor(sink.volume * 100)}
                  value={createBinding(sink, "volume").as(v => Math.floor(v * 100))}
                  max={Wireplumber.getDefault().getMaxSinkVolume()}
                  onChangeValue={(_, _scrollType, value) => sink.set_volume(value / 100)} />

                <Gtk.Button class={"more"} iconName={"go-next-symbolic"} onClicked={(_) => 
                    slidersPages.toggle(PageSound())} />
            </Gtk.Box>}
        </With>
        <With value={createBinding(Wireplumber.getWireplumber(), "defaultMicrophone")}>
            {(source: AstalWp.Endpoint) => <Gtk.Box class={"source microphone"} spacing={3}>
                <Gtk.Button onClicked={Wireplumber.getDefault().toggleMuteSink}
                    iconName={createBinding(source, "volumeIcon").as((icon) => 
                        (!Wireplumber.getDefault().isMutedSink() && 
                            Wireplumber.getDefault().getSinkVolume() > 0) ? 
                                icon
                            : "microphone-sensitivity-muted-symbolic"
                )} />

                <Astal.Slider drawValue={false} hexpand={true} 
                  $={(self) => self.value = Math.floor(source.volume * 100)}
                  value={createBinding(source, "volume").as(v => Math.floor(v * 100))}
                  max={Wireplumber.getDefault().getMaxSinkVolume()}
                  onChangeValue={(_, _scrollType, value) => source.set_volume(value / 100)} />

                <Gtk.Button class={"more"} iconName={"go-next-symbolic"} onClicked={(_) => 
                    slidersPages.toggle(PageMicrophone())} />
            </Gtk.Box>}
        </With>
        {slidersPages}
    </Gtk.Box>
}
