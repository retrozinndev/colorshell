import { Page, PageButton } from "./Page";
import { Astal, Gtk } from "ags/gtk4";
import { getAppIcon, lookupIcon } from "../../../scripts/apps";
import { Wireplumber } from "../../../scripts/volume";
import { tr } from "../../../i18n/intl";
import { createBinding, For } from "ags";
import AstalWp from "gi://AstalWp";
import { variableToBoolean } from "../../../scripts/utils";
import GObject from "gi://GObject?version=2.0";
import Pango from "gi://Pango?version=1.0";

export const PageSound = () => 
    <Page id={"sound"} title={tr("control_center.pages.sound.title")}
      description={tr("control_center.pages.sound.description")}>

        <Gtk.Label class={"sub-header"} label={tr("devices")} xalign={0} /> 
        <For each={createBinding(Wireplumber.getWireplumber().audio!, "speakers")}>
            {(sink: AstalWp.Endpoint) => 
                <PageButton class={createBinding(sink, "isDefault").as(isDefault =>
                      isDefault ? "default" : "")} 
                  icon={createBinding(sink, "icon").as(ico =>
                      lookupIcon(ico) ? ico : "audio-card-symbolic")}
                  title={createBinding(sink, "description").as(desc =>
                      desc ?? "Speaker")}
                  onClick={() => !sink.isDefault && sink.set_is_default(true)}
                  endWidget={
                      <Gtk.Image iconName={"object-select-symbolic"}
                        visible={createBinding(sink, "isDefault")}
                        css={"font-size: 18px;"}
                      />
                  }
            />}
        </For>

        <Gtk.Label class={"sub-header"} label={tr("apps")} xalign={0} 
          visible={variableToBoolean(
              createBinding(Wireplumber.getWireplumber().audio!, "streams")
          )}
        />
        <For each={createBinding(Wireplumber.getWireplumber().audio!, "streams")}>
            {(stream: AstalWp.Stream) => 
                <Gtk.Box hexpand={true} $={(self) => {
                    const conns: Map<GObject.Object, Array<number>> = new Map();
                    const controllerMotion = Gtk.EventControllerMotion.new();

                    self.add_controller(controllerMotion);

                    conns.set(controllerMotion, [
                        controllerMotion.connect("enter", () => {
                            const revealer = self.get_last_child()!.get_first_child() as Gtk.Revealer;
                            revealer.set_reveal_child(true);
                        }),
                        controllerMotion.connect("leave", () => {
                            const revealer = self.get_first_child()!.get_first_child() as Gtk.Revealer;
                            revealer.set_reveal_child(true);
                        })
                    ]);

                    conns.set(self, [
                        self.connect("destroy", () => conns.forEach((ids, obj) => 
                            ids.forEach(id => obj.disconnect(id))
                        ))
                    ]);
                }}>

                    <Gtk.Image iconName={createBinding(stream, "name").as(name => 
                        getAppIcon(name.split(' ')[0]) ?? "application-x-executable-symbolic")}
                      css={"font-size: 18px; margin-right: 6px;"} />

                    <Gtk.Box orientation={Gtk.Orientation.VERTICAL} hexpand={true}>
                        <Gtk.Revealer transitionDuration={180} 
                          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                            
                            <Gtk.Label label={createBinding(stream, "name").as(name =>
                                  name ?? "Unnamed audio stream")} 
                              ellipsize={Pango.EllipsizeMode.END}
                              tooltipText={createBinding(stream, "name")}
                              class={"name"} xalign={0}
                            />
                        </Gtk.Revealer>

                        <Astal.Slider drawValue={false} max={100} $={(self) => {
                              self.value = Math.floor(stream.volume * 100);
                          }} value={createBinding(stream, "volume").as(vol =>
                              Math.floor(vol * 100))}
                          onChangeValue={(_, type, value) => {
                              if(type !== undefined && type !== null)
                                  stream.volume = Math.floor(value / 100);
                          }}
                        />
                    </Gtk.Box>
                </Gtk.Box>
            }
        </For>
    </Page> as Page;
