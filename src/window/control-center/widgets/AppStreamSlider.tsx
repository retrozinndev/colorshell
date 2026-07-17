import Pango from "gi://Pango?version=1.0";
import Gtk from "gi://Gtk?version=4.0";
import Astal from "gi://Astal?version=4.0";
import AstalWp from "gi://AstalWp?version=0.1";
import { CCProps, createBinding, createComputed } from "ags";
import { getAppIcon } from "../../../modules/apps";
import { omitObjectKeys } from "../../../modules/utils";
import Adw from "gi://Adw?version=1";


type AudioStream = AstalWp.Stream&{
    defaultVolume: number;
};

export default (props: Partial<CCProps<Gtk.Box, Gtk.Box.ConstructorProps>> & {
    stream: AstalWp.Stream|AudioStream
}) => {
    const stream = props.stream as AudioStream;
    const volume = createBinding(stream, "volume"),
        volumePercentage = createBinding(stream, "volume")(v => `${Math.round(v * 100)}%`);
    const name = createComputed([
        createBinding(stream, "name"),
        createBinding(stream, "description")
    ], (name, desc) => name ?? desc ?? "Unknown app stream");

    // kind of a hack, but avoids creating an abstraction on top of AstalWp
    if(stream?.defaultVolume === undefined)
        setupProps(stream);

    return <Gtk.Box class={"audio-stream-controller"} {...omitObjectKeys(props, ["stream"])} 
      orientation={Gtk.Orientation.VERTICAL}>

        <Gtk.Box spacing={4}>
            <Gtk.Button iconName={createComputed([
                  createBinding(stream, "mute"),
                  name(name => getAppIcon(name) ?? "application-x-executable-symbolic")
              ], (muted, iconName) => muted ? "audio-volume-muted-symbolic" : iconName)}
              css={"margin-right: 6px;"}
              vexpand={false}
              valign={Gtk.Align.CENTER}
              onClicked={() => stream.mute = !stream.mute}
            />
            <Gtk.Label label={name} ellipsize={Pango.EllipsizeMode.END}
              tooltipText={createBinding(stream, "description")(s => s ?? "")}
              class={"name"} xalign={0} hexpand
            />
            <Gtk.Revealer transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
              revealChild={volume(v => Math.round(v * 100) !== Math.round(stream.defaultVolume * 100))}>

                <Gtk.Box>
                    <Gtk.Button class="reactive-secondary" iconName="object-select-symbolic"
                      onClicked={() => {
                          stream.defaultVolume = stream.volume;
                          stream.notify("volume");
                      }}
                    />
                    <Gtk.Button class="reactive-secondary" iconName="arrow-circular-top-right-symbolic"
                      onClicked={() => stream.volume = stream.defaultVolume}
                    />
                </Gtk.Box>
            </Gtk.Revealer>
        </Gtk.Box>

        <Gtk.Box spacing={4}>
            <Gtk.Label label={volumePercentage} widthRequest={50} class="number" 
              valign={Gtk.Align.START}
            />
            <Astal.Slider drawValue={false} value={volume} 
              onChangeValue={(_, __, value) => stream.set_volume(value)}
              hexpand min={0} max={1.5} $={self => {
                  self.add_mark(0, Gtk.PositionType.RIGHT, "Mute");
                  self.add_mark(.5, Gtk.PositionType.RIGHT, "50%");
                  self.add_mark(1, Gtk.PositionType.RIGHT, "100%");
                  self.add_mark(1.5, Gtk.PositionType.RIGHT, "+50%");
              }}
            />
        </Gtk.Box>
    </Gtk.Box> as Gtk.Box;
}

function setupProps(stream: AudioStream): void {
    if(stream.volume > 0) {
        stream.defaultVolume = stream.volume;
        return;
    }

    const id = stream.connect("notify::volume", () => {
        if(!(stream.volume > 0)) {
            stream.defaultVolume = stream.volume;
            stream.disconnect(id);
            return;
        }
    });
}
