import { Astal, Gtk } from "ags/gtk4";
import Wireplumber from "../../../modules/volume";
import { createBinding, With } from "ags";
import Backlights from "../../../modules/backlights";
import AstalWp from "gi://AstalWp";
import ControlCenterWindow from "..";


export function Sliders({ccWindow}: { ccWindow: ControlCenterWindow }) {
    return <Gtk.Box class={"sliders"} orientation={Gtk.Orientation.VERTICAL} 
      hexpand spacing={10}>

        <With value={createBinding(Wireplumber.getWireplumber(), "defaultSpeaker")}>
            {(sink: AstalWp.Endpoint) => <Gtk.Box class={"sink speaker"} spacing={3}>
                <Gtk.Button onClicked={() => Wireplumber.getDefault().toggleMuteSink()}
                    iconName={createBinding(sink, "volumeIcon").as((icon) => 
                        (!Wireplumber.getDefault().isMutedSink() && 
                            Wireplumber.getDefault().getSinkVolume() > 0
                        ) ? icon : "audio-volume-muted-symbolic"
                )} />

                <Astal.Slider drawValue={false} hexpand value={createBinding(sink, "volume")}
                  max={Wireplumber.getDefault().getMaxSinkVolume() / 100}
                  onChangeValue={(_, __, value) => sink.set_volume(value)} />

                <Gtk.Button class={"more"} iconName={"go-next-symbolic"} onClicked={() => 
                    ccWindow.pages.toggle("sound")} />
            </Gtk.Box>}
        </With>
        <With value={createBinding(Wireplumber.getWireplumber(), "defaultMicrophone")}>
            {(source: AstalWp.Endpoint) => <Gtk.Box class={"source microphone"} spacing={3}>
                <Gtk.Button onClicked={() => Wireplumber.getDefault().toggleMuteSource()}
                    iconName={createBinding(source, "volumeIcon").as((icon) => 
                        (!Wireplumber.getDefault().isMutedSource() && 
                            Wireplumber.getDefault().getSourceVolume() > 0
                        ) ? icon : "microphone-sensitivity-muted-symbolic"
                )} />

                <Astal.Slider drawValue={false} hexpand value={createBinding(source, "volume")}
                  max={Wireplumber.getDefault().getMaxSourceVolume() / 100}
                  onChangeValue={(_, __, value) => source.set_volume(value)} />

                <Gtk.Button class={"more"} iconName={"go-next-symbolic"} onClicked={() => 
                    ccWindow.pages.toggle("microphone")} />
            </Gtk.Box>}
        </With>
        <Gtk.Box visible={createBinding(Backlights.getDefault(), "available")}>
            <With value={createBinding(Backlights.getDefault(), "default")}>
                {(bklight: Backlights.Backlight|null) => bklight && 
                    <Gtk.Box class={"backlight"} spacing={3}>
                        <Gtk.Button onClicked={() => {
                              bklight.brightness = bklight.maxBrightness
                          }} iconName={"display-brightness-symbolic"}
                        />

                        <Astal.Slider drawValue={false} hexpand value={createBinding(bklight, "brightness")} 
                          max={bklight.maxBrightness}
                          onChangeValue={(_, __, value) => {
                              bklight.brightness = value
                          }}
                        />
                        <Gtk.Button class={"more"} iconName={"go-next-symbolic"} onClicked={() => 
                            ccWindow.pages.toggle("backlight")} />
                    </Gtk.Box>
                }
            </With>
        </Gtk.Box>
    </Gtk.Box>
}
